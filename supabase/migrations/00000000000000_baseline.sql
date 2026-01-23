


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_comment_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert the comment
  INSERT INTO comments (user_id, comment_text)
  VALUES (v_user_id, p_comment_text)
  RETURNING id INTO v_comment_id;

  -- Link to the appropriate entity
  IF p_entity_type = 'album' THEN
    INSERT INTO album_comments (album_id, comment_id)
    VALUES (p_entity_id, v_comment_id);
  ELSIF p_entity_type = 'photo' THEN
    INSERT INTO photo_comments (photo_id, comment_id)
    VALUES (p_entity_id, v_comment_id);
  ELSE
    RAISE EXCEPTION 'Invalid entity type: %', p_entity_type;
  END IF;

  RETURN v_comment_id;
END;
$$;


ALTER FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text") IS 'Atomically creates a comment and links it to an album or photo';



CREATE OR REPLACE FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_comment_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert the comment
  INSERT INTO comments (user_id, comment_text)
  VALUES (v_user_id, p_comment_text)
  RETURNING id INTO v_comment_id;

  -- Link to the event
  INSERT INTO event_comments (event_id, comment_id)
  VALUES (p_event_id, v_comment_id);

  RETURN v_comment_id;
END;
$$;


ALTER FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text") IS 'Creates a comment and links it to an event';



CREATE OR REPLACE FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_album_user_id UUID;
  v_photo RECORD;
  v_max_sort_order INTEGER;
  v_inserted_count INTEGER := 0;
  v_current_sort INTEGER;
  v_first_photo_url TEXT;
  v_has_cover BOOLEAN;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the user owns the album
  SELECT user_id INTO v_album_user_id
  FROM albums
  WHERE id = p_album_id;

  IF v_album_user_id IS NULL THEN
    RAISE EXCEPTION 'Album not found';
  END IF;

  IF v_album_user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to modify this album';
  END IF;

  -- Check if album already has a cover
  SELECT cover_image_url IS NOT NULL INTO v_has_cover
  FROM albums
  WHERE id = p_album_id;

  -- Get current max sort_order
  SELECT COALESCE(MAX(sort_order), -1) INTO v_max_sort_order
  FROM album_photos
  WHERE album_id = p_album_id;

  v_current_sort := v_max_sort_order + 1;

  -- Insert photos that don't already exist in the album, preserving input order
  FOR v_photo IN 
    SELECT p.id, p.url, p.width, p.height
    FROM unnest(p_photo_ids) WITH ORDINALITY AS input_photo(id, input_order)
    JOIN photos p ON p.id = input_photo.id
    WHERE p.user_id = v_user_id
      AND NOT EXISTS (
        SELECT 1 FROM album_photos ap 
        WHERE ap.album_id = p_album_id AND ap.photo_id = p.id
      )
    ORDER BY input_photo.input_order
  LOOP
    INSERT INTO album_photos (album_id, photo_id, photo_url, width, height, sort_order)
    VALUES (p_album_id, v_photo.id, v_photo.url, v_photo.width, v_photo.height, v_current_sort);
    
    -- Set first photo as manual cover if album doesn't have a cover yet
    IF v_inserted_count = 0 AND NOT v_has_cover THEN
      v_first_photo_url := v_photo.url;
    END IF;
    
    v_current_sort := v_current_sort + 1;
    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  -- Set first photo as manual cover if we inserted photos and album had no cover
  IF v_inserted_count > 0 AND NOT v_has_cover AND v_first_photo_url IS NOT NULL THEN
    UPDATE albums
    SET cover_image_url = v_first_photo_url,
        cover_is_manual = true,
        updated_at = NOW()
    WHERE id = p_album_id;
  END IF;

  RETURN v_inserted_count;
END;
$$;


ALTER FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) IS 'Efficiently adds multiple photos to an album, handling deduplication and sort_order. Sets first photo as manual cover if album has no cover.';



CREATE OR REPLACE FUNCTION "public"."admin_delete_album"("p_album_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_comment_ids UUID[];
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the user is an admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = v_user_id;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Check album exists and is not already deleted
  IF NOT EXISTS (SELECT 1 FROM albums WHERE id = p_album_id AND deleted_at IS NULL) THEN
    RETURN FALSE; -- Album not found or already deleted
  END IF;

  -- Get all comment IDs linked to this album
  SELECT ARRAY_AGG(ac.comment_id) INTO v_comment_ids
  FROM album_comments ac
  JOIN comments c ON c.id = ac.comment_id
  WHERE ac.album_id = p_album_id AND c.deleted_at IS NULL;

  -- Soft delete the actual comments
  IF v_comment_ids IS NOT NULL AND array_length(v_comment_ids, 1) > 0 THEN
    UPDATE comments 
    SET deleted_at = NOW() 
    WHERE id = ANY(v_comment_ids) AND deleted_at IS NULL;
  END IF;

  -- Soft delete the album
  UPDATE albums 
  SET deleted_at = NOW() 
  WHERE id = p_album_id;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."admin_delete_album"("p_album_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."admin_delete_album"("p_album_id" "uuid") IS 'Admin-only: Soft deletes any album and related comments by setting deleted_at timestamp';



CREATE OR REPLACE FUNCTION "public"."auto_assign_album_photo_sort_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Only auto-assign if sort_order is not provided or is null
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), -1) + 1 INTO NEW.sort_order
    FROM public.album_photos
    WHERE album_id = NEW.album_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_assign_album_photo_sort_order"() OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."auto_assign_album_photo_sort_order"() IS 'Auto-assigns sort_order to new album_photos based on current max + 1';



CREATE OR REPLACE FUNCTION "public"."batch_update_album_photos"("photo_updates" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  album_user_id uuid;
BEGIN
  -- Get the album's user_id from the first photo to verify ownership
  SELECT a.user_id INTO album_user_id
  FROM public.album_photos ap
  JOIN public.albums a ON a.id = ap.album_id
  WHERE ap.id = ((photo_updates->0)->>'id')::uuid
  LIMIT 1;

  -- Only proceed if the current user owns the album
  IF album_user_id = auth.uid() THEN
    UPDATE public.album_photos
    SET 
      title = COALESCE(update_item->>'title', public.album_photos.title),
      sort_order = COALESCE((update_item->>'sort_order')::int, public.album_photos.sort_order)
    FROM jsonb_array_elements(photo_updates) AS update_item
    WHERE public.album_photos.id = (update_item->>'id')::uuid;
  END IF;
END;
$$;


ALTER FUNCTION "public"."batch_update_album_photos"("photo_updates" "jsonb") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."batch_update_photos"("photo_updates" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.photos
  SET 
    title = COALESCE(update_item->>'title', public.photos.title),
    description = COALESCE(update_item->>'description', public.photos.description),
    is_public = COALESCE((update_item->>'is_public')::boolean, public.photos.is_public),
    sort_order = COALESCE((update_item->>'sort_order')::int, public.photos.sort_order)
  FROM jsonb_array_elements(photo_updates) AS update_item
  WHERE public.photos.id = (update_item->>'id')::uuid
    AND public.photos.user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."batch_update_photos"("photo_updates" "jsonb") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."bulk_delete_photos"("p_photo_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Soft delete photos owned by the user
  -- Note: Storage files need to be deleted separately by the client
  -- because we can't access storage from SQL functions
  WITH updated AS (
    UPDATE photos
    SET deleted_at = NOW()
    WHERE id = ANY(p_photo_ids)
      AND user_id = v_user_id
      AND deleted_at IS NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM updated;

  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."bulk_delete_photos"("p_photo_ids" "uuid"[]) OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."bulk_delete_photos"("p_photo_ids" "uuid"[]) IS 'Soft deletes multiple photos owned by the current user by setting deleted_at timestamp';



CREATE OR REPLACE FUNCTION "public"."bulk_remove_from_album"("p_album_photo_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_album_user_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the user owns the album (check first album_photo)
  SELECT a.user_id INTO v_album_user_id
  FROM album_photos ap
  JOIN albums a ON a.id = ap.album_id
  WHERE ap.id = ANY(p_album_photo_ids)
  LIMIT 1;

  IF v_album_user_id IS NULL THEN
    RETURN 0; -- No photos found
  END IF;

  IF v_album_user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to modify this album';
  END IF;

  -- Delete the album_photos
  WITH deleted AS (
    DELETE FROM album_photos
    WHERE id = ANY(p_album_photo_ids)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."bulk_remove_from_album"("p_album_photo_ids" "uuid"[]) OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."bulk_remove_from_album"("p_album_photo_ids" "uuid"[]) IS 'Removes multiple photos from an album in a single transaction';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_auth_tokens"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM auth_tokens
  WHERE expires_at < NOW() OR used_at IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_auth_tokens"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."delete_album"("p_album_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_album_user_id UUID;
  v_comment_ids UUID[];
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the user owns the album
  SELECT user_id INTO v_album_user_id
  FROM albums
  WHERE id = p_album_id AND deleted_at IS NULL;

  IF v_album_user_id IS NULL THEN
    RETURN FALSE; -- Album not found or already deleted
  END IF;

  IF v_album_user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to delete this album';
  END IF;

  -- Get all comment IDs linked to this album
  SELECT ARRAY_AGG(ac.comment_id) INTO v_comment_ids
  FROM album_comments ac
  JOIN comments c ON c.id = ac.comment_id
  WHERE ac.album_id = p_album_id AND c.deleted_at IS NULL;

  -- Soft delete album_comments links (we'll keep them for referential integrity)
  -- But soft delete the actual comments
  IF v_comment_ids IS NOT NULL AND array_length(v_comment_ids, 1) > 0 THEN
    UPDATE comments 
    SET deleted_at = NOW() 
    WHERE id = ANY(v_comment_ids) AND deleted_at IS NULL;
  END IF;

  -- Soft delete album_photos (keep the relationship but mark photos as deleted if they're only in this album)
  -- Note: We don't delete album_photos entries, just the album itself
  -- Photos will be soft deleted separately if needed

  -- Soft delete album_tags (keep for referential integrity)
  -- Tags are just metadata, no need to soft delete them

  -- Soft delete the album
  UPDATE albums 
  SET deleted_at = NOW() 
  WHERE id = p_album_id;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."delete_album"("p_album_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."delete_album"("p_album_id" "uuid") IS 'Soft deletes an album and related comments by setting deleted_at timestamp';



CREATE OR REPLACE FUNCTION "public"."generate_short_id"("size" integer DEFAULT 5) RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  id TEXT := '';
  i INT := 0;
  chars TEXT := 'bcdfghjklmnpqrstvwxyz0123456789';
  chars_length INT := length(chars);
BEGIN
  WHILE i < size LOOP
    id := id || substr(chars, floor(random() * chars_length + 1)::INT, 1);
    i := i + 1;
  END LOOP;
  RETURN id;
END;
$$;


ALTER FUNCTION "public"."generate_short_id"("size" integer) OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."get_album_photo_count"("album_uuid" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.album_photos ap
  INNER JOIN public.photos p ON p.id = ap.photo_id
  WHERE ap.album_id = album_uuid
    AND p.deleted_at IS NULL;
$$;


ALTER FUNCTION "public"."get_album_photo_count"("album_uuid" "uuid") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."get_user_album_photos_count"("user_uuid" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.album_photos_active ap
  WHERE ap.album_id IN (
    SELECT id 
    FROM public.albums 
    WHERE user_id = user_uuid 
    AND deleted_at IS NULL
  );
$$;


ALTER FUNCTION "public"."get_user_album_photos_count"("user_uuid" "uuid") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, nickname, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'nickname', ''),  -- NULL if empty or not provided
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists (e.g., nickname conflict), just return
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."increment_view_count"("p_entity_type" "text", "p_entity_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_entity_type = 'photo' THEN
    UPDATE photos SET view_count = view_count + 1 WHERE id = p_entity_id;
  ELSIF p_entity_type = 'album' THEN
    UPDATE albums SET view_count = view_count + 1 WHERE id = p_entity_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."increment_view_count"("p_entity_type" "text", "p_entity_id" "uuid") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."restore_album"("p_album_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_album_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the user owns the album
  SELECT user_id INTO v_album_user_id
  FROM albums
  WHERE id = p_album_id AND deleted_at IS NOT NULL;

  IF v_album_user_id IS NULL THEN
    RETURN FALSE; -- Album not found or not deleted
  END IF;

  IF v_album_user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to restore this album';
  END IF;

  -- Restore the album
  UPDATE albums 
  SET deleted_at = NULL 
  WHERE id = p_album_id;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."restore_album"("p_album_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."restore_album"("p_album_id" "uuid") IS 'Restores a soft-deleted album by clearing deleted_at timestamp';



CREATE OR REPLACE FUNCTION "public"."restore_comment"("p_comment_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Restore comment owned by the user
  UPDATE comments
  SET deleted_at = NULL
  WHERE id = p_comment_id
    AND user_id = v_user_id
    AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."restore_comment"("p_comment_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."restore_comment"("p_comment_id" "uuid") IS 'Restores a soft-deleted comment by clearing deleted_at timestamp';



CREATE OR REPLACE FUNCTION "public"."restore_photo"("p_photo_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Restore photo owned by the user
  UPDATE photos
  SET deleted_at = NULL
  WHERE id = p_photo_id
    AND user_id = v_user_id
    AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."restore_photo"("p_photo_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."restore_photo"("p_photo_id" "uuid") IS 'Restores a soft-deleted photo by clearing deleted_at timestamp';



CREATE OR REPLACE FUNCTION "public"."set_photo_sort_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Increment sort_order of all existing photos for this user
  UPDATE public.photos
  SET sort_order = COALESCE(sort_order, 0) + 1
  WHERE user_id = NEW.user_id
    AND id != NEW.id;
  
  -- Set the new photo's sort_order to 0 (front of list)
  NEW.sort_order := 0;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_photo_sort_order"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."update_album_comments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_album_comments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_album_cover"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  target_album_id UUID;
  new_cover_url TEXT;
  deleted_photo_url TEXT;
BEGIN
  -- Only handle DELETE operations (when a photo is removed from an album)
  IF TG_OP != 'DELETE' THEN
    RETURN NEW;
  END IF;

  target_album_id := OLD.album_id;
  deleted_photo_url := OLD.photo_url;

  -- Check if the deleted photo was the cover photo
  IF EXISTS (
    SELECT 1 FROM public.albums
    WHERE id = target_album_id
      AND cover_image_url = deleted_photo_url
  ) THEN
    -- Get the first photo by sort_order for this album (excluding deleted photos)
    SELECT ap.photo_url INTO new_cover_url
    FROM public.album_photos ap
    JOIN public.photos p ON p.id = ap.photo_id
    WHERE ap.album_id = target_album_id
      AND p.deleted_at IS NULL
    ORDER BY ap.sort_order ASC NULLS LAST, ap.created_at ASC
    LIMIT 1;

    -- Update the album's cover image (set to NULL if no photos found)
    -- Keep cover_is_manual = true since we're just replacing a deleted manual cover
    UPDATE public.albums
    SET cover_image_url = new_cover_url,
        updated_at = NOW()
    WHERE id = target_album_id;
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."update_album_cover"() OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."update_album_cover"() IS 'Updates album cover_image_url only when the cover photo is deleted from the album. Covers are always set as manual.';



CREATE OR REPLACE FUNCTION "public"."update_album_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE albums SET likes_count = likes_count + 1 WHERE id = NEW.album_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE albums SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.album_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_album_likes_count"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."update_comments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_comments_updated_at"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."update_interest_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Insert interest if it doesn't exist, or increment count
    INSERT INTO interests (name, count)
    VALUES (NEW.interest, 1)
    ON CONFLICT (name) DO UPDATE SET count = interests.count + 1;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement count (don't delete interest even if count reaches 0, for history)
    UPDATE interests SET count = GREATEST(count - 1, 0) WHERE name = OLD.interest;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_interest_count"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."update_photo_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE photos SET likes_count = likes_count + 1 WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE photos SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_photo_likes_count"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."update_tag_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Insert tag if it doesn't exist, or increment count
    INSERT INTO tags (name, count)
    VALUES (NEW.tag, 1)
    ON CONFLICT (name) DO UPDATE SET count = tags.count + 1;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement count (don't delete tag even if count reaches 0, for history)
    UPDATE tags SET count = GREATEST(count - 1, 0) WHERE name = OLD.tag;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_tag_count"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."album_comments" (
    "album_id" "uuid" NOT NULL,
    "comment_id" "uuid" NOT NULL
);


ALTER TABLE "public"."album_comments" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."album_likes" (
    "album_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."album_likes" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."album_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "album_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "title" "text",
    "description" "text",
    "width" integer,
    "height" integer,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "photo_id" "uuid" NOT NULL
);


ALTER TABLE "public"."album_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "storage_path" "text" NOT NULL,
    "url" "text" NOT NULL,
    "width" integer NOT NULL,
    "height" integer NOT NULL,
    "file_size" integer NOT NULL,
    "mime_type" "text" NOT NULL,
    "exif_data" "jsonb",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "title" "text",
    "description" "text",
    "is_public" boolean DEFAULT true NOT NULL,
    "sort_order" integer,
    "blurhash" "text",
    "short_id" "text" DEFAULT "public"."generate_short_id"(5) NOT NULL,
    "original_filename" "text",
    "deleted_at" timestamp with time zone,
    "likes_count" integer DEFAULT 0 NOT NULL,
    "view_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."photos" OWNER TO "supabase_admin";


CREATE OR REPLACE VIEW "public"."album_photos_active" WITH ("security_invoker"='true') AS
 SELECT "ap"."id",
    "ap"."album_id",
    "ap"."photo_url",
    "ap"."title",
    "ap"."description",
    "ap"."width",
    "ap"."height",
    "ap"."sort_order",
    "ap"."created_at",
    "ap"."photo_id"
   FROM ("public"."album_photos" "ap"
     JOIN "public"."photos" "p" ON (("p"."id" = "ap"."photo_id")))
  WHERE ("p"."deleted_at" IS NULL);


ALTER VIEW "public"."album_photos_active" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."album_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "album_id" "uuid" NOT NULL,
    "tag" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."album_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."albums" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "cover_image_url" "text",
    "is_public" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_suspended" boolean DEFAULT false,
    "suspended_at" timestamp with time zone,
    "suspended_by" "uuid",
    "suspension_reason" "text",
    "deleted_at" timestamp with time zone,
    "cover_is_manual" boolean DEFAULT false,
    "likes_count" integer DEFAULT 0 NOT NULL,
    "view_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."albums" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "token_hash" "text" NOT NULL,
    "token_type" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "new_email" "text",
    CONSTRAINT "auth_tokens_token_type_check" CHECK (("token_type" = ANY (ARRAY['email_confirmation'::"text", 'password_reset'::"text", 'email_change'::"text"])))
);


ALTER TABLE "public"."auth_tokens" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."comments" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."email_preferences" (
    "user_id" "uuid" NOT NULL,
    "email_type_id" integer NOT NULL,
    "opted_out" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_preferences" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."email_types" (
    "id" integer NOT NULL,
    "type_key" "text" NOT NULL,
    "type_label" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_types" OWNER TO "supabase_admin";


CREATE SEQUENCE IF NOT EXISTS "public"."email_types_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."email_types_id_seq" OWNER TO "supabase_admin";


ALTER SEQUENCE "public"."email_types_id_seq" OWNED BY "public"."email_types"."id";



CREATE TABLE IF NOT EXISTS "public"."event_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" integer NOT NULL,
    "announced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "announced_by" "uuid",
    "recipient_count" integer NOT NULL
);


ALTER TABLE "public"."event_announcements" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."event_comments" (
    "event_id" integer NOT NULL,
    "comment_id" "uuid" NOT NULL
);


ALTER TABLE "public"."event_comments" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" integer NOT NULL,
    "title" "text",
    "description" "text",
    "date" "date",
    "time" time without time zone,
    "location" "text",
    "cover_image" "text",
    "rsvp_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "image_url" "text",
    "image_blurhash" "text",
    "image_width" integer,
    "image_height" integer,
    "max_attendees" integer,
    "slug" "text" NOT NULL,
    "rsvp_reminder_sent_at" timestamp with time zone,
    "attendee_reminder_sent_at" timestamp with time zone
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."events_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."events_id_seq" OWNED BY "public"."events"."id";



CREATE TABLE IF NOT EXISTS "public"."events_rsvps" (
    "id" integer NOT NULL,
    "event_id" integer,
    "user_id" "uuid",
    "name" "text",
    "email" "text",
    "uuid" "uuid" DEFAULT "gen_random_uuid"(),
    "ip_address" "text",
    "confirmed_at" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "attended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."events_rsvps" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."events_rsvps_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."events_rsvps_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."events_rsvps_id_seq" OWNED BY "public"."events_rsvps"."id";



CREATE TABLE IF NOT EXISTS "public"."interests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."interests" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "type" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "seen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "dismissed_at" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."photo_comments" (
    "photo_id" "uuid" NOT NULL,
    "comment_id" "uuid" NOT NULL
);


ALTER TABLE "public"."photo_comments" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."photo_likes" (
    "photo_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."photo_likes" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."photo_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "photo_id" "uuid" NOT NULL,
    "tag" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."photo_tags" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."profile_interests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "interest" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profile_interests" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "nickname" "text",
    "avatar_url" "text",
    "bio" "text",
    "website" "text",
    "is_admin" boolean DEFAULT false,
    "last_logged_in" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "social_links" "jsonb" DEFAULT '[]'::"jsonb",
    "album_card_style" "text" DEFAULT 'large'::"text",
    "suspended_at" timestamp with time zone,
    "suspended_reason" "text",
    "theme" "text" DEFAULT 'system'::"text",
    "newsletter_opt_in" boolean DEFAULT false NOT NULL,
    "terms_accepted_at" timestamp with time zone,
    CONSTRAINT "album_card_style_check" CHECK ((("album_card_style" IS NULL) OR ("album_card_style" = ANY (ARRAY['large'::"text", 'compact'::"text"])))),
    CONSTRAINT "check_social_links_max_3" CHECK (("jsonb_array_length"(COALESCE("social_links", '[]'::"jsonb")) <= 3)),
    CONSTRAINT "profiles_nickname_format" CHECK ((("nickname" IS NULL) OR ("nickname" ~ '^[a-z0-9-]+$'::"text"))),
    CONSTRAINT "profiles_nickname_length" CHECK ((("nickname" IS NULL) OR (("length"("nickname") >= 3) AND ("length"("nickname") <= 30)))),
    CONSTRAINT "theme_check" CHECK ((("theme" IS NULL) OR ("theme" = ANY (ARRAY['light'::"text", 'dark'::"text", 'midnight'::"text", 'system'::"text"]))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."social_links" IS 'Array of social links (max 3). Format: [{ "label": string, "url": string }]';



COMMENT ON COLUMN "public"."profiles"."terms_accepted_at" IS 'Timestamp when the user accepted the Terms of Service during onboarding';



CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tags" OWNER TO "supabase_admin";


ALTER TABLE ONLY "public"."email_types" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."email_types_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."events_rsvps" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."events_rsvps_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."album_comments"
    ADD CONSTRAINT "album_comments_pkey1" PRIMARY KEY ("album_id", "comment_id");



ALTER TABLE ONLY "public"."album_likes"
    ADD CONSTRAINT "album_likes_pkey" PRIMARY KEY ("album_id", "user_id");



ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_album_photo_unique" UNIQUE ("album_id", "photo_id");



ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_unique_photo" UNIQUE ("album_id", "photo_url");



ALTER TABLE ONLY "public"."album_tags"
    ADD CONSTRAINT "album_tags_album_id_tag_key" UNIQUE ("album_id", "tag");



ALTER TABLE ONLY "public"."album_tags"
    ADD CONSTRAINT "album_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."albums"
    ADD CONSTRAINT "albums_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."albums"
    ADD CONSTRAINT "albums_user_id_slug_key" UNIQUE ("user_id", "slug");



ALTER TABLE ONLY "public"."auth_tokens"
    ADD CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("user_id", "email_type_id");



ALTER TABLE ONLY "public"."email_types"
    ADD CONSTRAINT "email_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_types"
    ADD CONSTRAINT "email_types_type_key_key" UNIQUE ("type_key");



ALTER TABLE ONLY "public"."event_announcements"
    ADD CONSTRAINT "event_announcements_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."event_announcements"
    ADD CONSTRAINT "event_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_pkey" PRIMARY KEY ("event_id", "comment_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events_rsvps"
    ADD CONSTRAINT "events_rsvps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events_rsvps"
    ADD CONSTRAINT "events_rsvps_uuid_key" UNIQUE ("uuid");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "images_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "images_url_key" UNIQUE ("url");



ALTER TABLE ONLY "public"."interests"
    ADD CONSTRAINT "interests_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."interests"
    ADD CONSTRAINT "interests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."photo_comments"
    ADD CONSTRAINT "photo_comments_pkey" PRIMARY KEY ("photo_id", "comment_id");



ALTER TABLE ONLY "public"."photo_likes"
    ADD CONSTRAINT "photo_likes_pkey" PRIMARY KEY ("photo_id", "user_id");



ALTER TABLE ONLY "public"."photo_tags"
    ADD CONSTRAINT "photo_tags_photo_id_tag_key" UNIQUE ("photo_id", "tag");



ALTER TABLE ONLY "public"."photo_tags"
    ADD CONSTRAINT "photo_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_interests"
    ADD CONSTRAINT "profile_interests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_interests"
    ADD CONSTRAINT "profile_interests_profile_id_interest_key" UNIQUE ("profile_id", "interest");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_nickname_key" UNIQUE ("nickname");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



CREATE INDEX "albums_created_at_idx" ON "public"."albums" USING "btree" ("created_at");



CREATE INDEX "events_date_idx" ON "public"."events" USING "btree" ("date");



CREATE INDEX "events_rsvps_canceled_at_idx" ON "public"."events_rsvps" USING "btree" ("canceled_at");



CREATE INDEX "events_rsvps_email_idx" ON "public"."events_rsvps" USING "btree" ("email");



CREATE INDEX "events_rsvps_event_id_idx" ON "public"."events_rsvps" USING "btree" ("event_id");



CREATE INDEX "events_rsvps_user_id_idx" ON "public"."events_rsvps" USING "btree" ("user_id");



CREATE INDEX "events_rsvps_uuid_idx" ON "public"."events_rsvps" USING "btree" ("uuid");



CREATE INDEX "events_slug_idx" ON "public"."events" USING "btree" ("slug");



CREATE INDEX "idx_album_comments_album" ON "public"."album_comments" USING "btree" ("album_id");



CREATE INDEX "idx_album_comments_comment" ON "public"."album_comments" USING "btree" ("comment_id");



CREATE INDEX "idx_album_likes_album_id" ON "public"."album_likes" USING "btree" ("album_id");



CREATE INDEX "idx_album_likes_user_id" ON "public"."album_likes" USING "btree" ("user_id");



CREATE INDEX "idx_album_photos_album_id" ON "public"."album_photos" USING "btree" ("album_id");



CREATE INDEX "idx_album_photos_photo_id" ON "public"."album_photos" USING "btree" ("photo_id");



CREATE INDEX "idx_album_photos_sort_order" ON "public"."album_photos" USING "btree" ("album_id", "sort_order");



CREATE INDEX "idx_album_tags_album_id" ON "public"."album_tags" USING "btree" ("album_id");



CREATE INDEX "idx_album_tags_tag" ON "public"."album_tags" USING "btree" ("tag");



CREATE INDEX "idx_albums_deleted_at" ON "public"."albums" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_albums_is_public" ON "public"."albums" USING "btree" ("is_public");



CREATE INDEX "idx_albums_is_suspended" ON "public"."albums" USING "btree" ("is_suspended") WHERE ("is_suspended" = true);



CREATE INDEX "idx_albums_likes_count" ON "public"."albums" USING "btree" ("likes_count" DESC);



CREATE INDEX "idx_albums_public_created_deleted" ON "public"."albums" USING "btree" ("is_public", "created_at" DESC, "deleted_at") WHERE (("is_public" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_albums_slug" ON "public"."albums" USING "btree" ("slug");



CREATE INDEX "idx_albums_user_id" ON "public"."albums" USING "btree" ("user_id");



CREATE INDEX "idx_albums_user_public_deleted" ON "public"."albums" USING "btree" ("user_id", "is_public", "deleted_at", "created_at" DESC) WHERE (("is_public" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_albums_view_count" ON "public"."albums" USING "btree" ("view_count" DESC);



CREATE INDEX "idx_auth_tokens_email_type" ON "public"."auth_tokens" USING "btree" ("email", "token_type");



CREATE INDEX "idx_auth_tokens_expires" ON "public"."auth_tokens" USING "btree" ("expires_at") WHERE ("used_at" IS NULL);



CREATE INDEX "idx_comments_created" ON "public"."comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_comments_deleted_at" ON "public"."comments" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_comments_user" ON "public"."comments" USING "btree" ("user_id");



CREATE INDEX "idx_email_preferences_email_type_id" ON "public"."email_preferences" USING "btree" ("email_type_id");



CREATE INDEX "idx_email_preferences_opted_out" ON "public"."email_preferences" USING "btree" ("opted_out") WHERE ("opted_out" = true);



CREATE INDEX "idx_email_preferences_user_id" ON "public"."email_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_event_announcements_announced_by" ON "public"."event_announcements" USING "btree" ("announced_by");



CREATE INDEX "idx_event_announcements_event_id" ON "public"."event_announcements" USING "btree" ("event_id");



CREATE INDEX "idx_interests_count" ON "public"."interests" USING "btree" ("count" DESC);



CREATE INDEX "idx_interests_name" ON "public"."interests" USING "btree" ("name");



CREATE INDEX "idx_interests_name_prefix" ON "public"."interests" USING "btree" ("name" "text_pattern_ops");



CREATE INDEX "idx_notifications_user_active" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC) WHERE ("dismissed_at" IS NULL);



CREATE INDEX "idx_notifications_user_all" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_unseen" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC) WHERE (("seen_at" IS NULL) AND ("dismissed_at" IS NULL));



CREATE INDEX "idx_photo_comments_comment" ON "public"."photo_comments" USING "btree" ("comment_id");



CREATE INDEX "idx_photo_comments_photo" ON "public"."photo_comments" USING "btree" ("photo_id");



CREATE INDEX "idx_photo_likes_photo_id" ON "public"."photo_likes" USING "btree" ("photo_id");



CREATE INDEX "idx_photo_likes_user_id" ON "public"."photo_likes" USING "btree" ("user_id");



CREATE INDEX "idx_photo_tags_photo_id" ON "public"."photo_tags" USING "btree" ("photo_id");



CREATE INDEX "idx_photo_tags_tag" ON "public"."photo_tags" USING "btree" ("tag");



CREATE INDEX "idx_photos_deleted_at" ON "public"."photos" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_photos_id_deleted_at" ON "public"."photos" USING "btree" ("id", "deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_photos_likes_count" ON "public"."photos" USING "btree" ("likes_count" DESC);



CREATE INDEX "idx_photos_original_filename" ON "public"."photos" USING "btree" ("original_filename") WHERE ("original_filename" IS NOT NULL);



CREATE UNIQUE INDEX "idx_photos_short_id" ON "public"."photos" USING "btree" ("short_id") WHERE ("short_id" IS NOT NULL);



CREATE INDEX "idx_photos_storage_path" ON "public"."photos" USING "btree" ("storage_path");



CREATE INDEX "idx_photos_url" ON "public"."photos" USING "btree" ("url");



CREATE INDEX "idx_photos_user_all" ON "public"."photos" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_photos_user_id" ON "public"."photos" USING "btree" ("user_id");



CREATE INDEX "idx_photos_user_public" ON "public"."photos" USING "btree" ("user_id", "created_at" DESC) WHERE ("is_public" = true);



CREATE INDEX "idx_photos_user_sorted" ON "public"."photos" USING "btree" ("user_id", "sort_order", "created_at" DESC);



CREATE INDEX "idx_photos_view_count" ON "public"."photos" USING "btree" ("view_count" DESC);



CREATE INDEX "idx_profile_interests_interest" ON "public"."profile_interests" USING "btree" ("interest");



CREATE INDEX "idx_profile_interests_profile_id" ON "public"."profile_interests" USING "btree" ("profile_id");



CREATE INDEX "idx_profiles_suspended_at" ON "public"."profiles" USING "btree" ("suspended_at") WHERE ("suspended_at" IS NOT NULL);



CREATE INDEX "idx_tags_count" ON "public"."tags" USING "btree" ("count" DESC);



CREATE INDEX "idx_tags_name" ON "public"."tags" USING "btree" ("name");



CREATE INDEX "idx_tags_name_prefix" ON "public"."tags" USING "btree" ("name" "text_pattern_ops");



CREATE INDEX "profiles_email_idx" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "profiles_nickname_idx" ON "public"."profiles" USING "btree" ("nickname");



CREATE OR REPLACE TRIGGER "photo_sort_order_trigger" BEFORE INSERT ON "public"."photos" FOR EACH ROW EXECUTE FUNCTION "public"."set_photo_sort_order"();



CREATE OR REPLACE TRIGGER "trigger_album_tags_count" AFTER INSERT OR DELETE ON "public"."album_tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_tag_count"();



CREATE OR REPLACE TRIGGER "trigger_auto_assign_sort_order" BEFORE INSERT ON "public"."album_photos" FOR EACH ROW EXECUTE FUNCTION "public"."auto_assign_album_photo_sort_order"();



CREATE OR REPLACE TRIGGER "trigger_photo_tags_count" AFTER INSERT OR DELETE ON "public"."photo_tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_tag_count"();



CREATE OR REPLACE TRIGGER "trigger_profile_interests_count" AFTER INSERT OR DELETE ON "public"."profile_interests" FOR EACH ROW EXECUTE FUNCTION "public"."update_interest_count"();



CREATE OR REPLACE TRIGGER "trigger_update_album_cover" AFTER INSERT OR DELETE OR UPDATE OF "sort_order", "photo_url" ON "public"."album_photos" FOR EACH ROW EXECUTE FUNCTION "public"."update_album_cover"();



CREATE OR REPLACE TRIGGER "trigger_update_album_likes_count" AFTER INSERT OR DELETE ON "public"."album_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_album_likes_count"();



CREATE OR REPLACE TRIGGER "trigger_update_photo_likes_count" AFTER INSERT OR DELETE ON "public"."photo_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_photo_likes_count"();



CREATE OR REPLACE TRIGGER "update_albums_updated_at" BEFORE UPDATE ON "public"."albums" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_comments_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_comments_updated_at"();



ALTER TABLE ONLY "public"."album_comments"
    ADD CONSTRAINT "album_comments_album_id_fkey1" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_comments"
    ADD CONSTRAINT "album_comments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_likes"
    ADD CONSTRAINT "album_likes_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_likes"
    ADD CONSTRAINT "album_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_tags"
    ADD CONSTRAINT "album_tags_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."albums"
    ADD CONSTRAINT "albums_suspended_by_fkey" FOREIGN KEY ("suspended_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."albums"
    ADD CONSTRAINT "albums_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auth_tokens"
    ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_email_type_id_fkey" FOREIGN KEY ("email_type_id") REFERENCES "public"."email_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_announcements"
    ADD CONSTRAINT "event_announcements_announced_by_fkey" FOREIGN KEY ("announced_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."event_announcements"
    ADD CONSTRAINT "event_announcements_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events_rsvps"
    ADD CONSTRAINT "events_rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events_rsvps"
    ADD CONSTRAINT "events_rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events_rsvps"
    ADD CONSTRAINT "events_rsvps_user_id_profiles_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "fk_album_photos_photo_url" FOREIGN KEY ("photo_url") REFERENCES "public"."photos"("url") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "fk_album_photos_photo_url" ON "public"."album_photos" IS 'When a photo is deleted, automatically remove it from all albums';



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "images_uploaded_by_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photo_comments"
    ADD CONSTRAINT "photo_comments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photo_comments"
    ADD CONSTRAINT "photo_comments_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photo_likes"
    ADD CONSTRAINT "photo_likes_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photo_likes"
    ADD CONSTRAINT "photo_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photo_tags"
    ADD CONSTRAINT "photo_tags_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_interests"
    ADD CONSTRAINT "profile_interests_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can create event announcements" ON "public"."event_announcements" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can view all event announcements" ON "public"."event_announcements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Album likes are publicly readable" ON "public"."album_likes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."albums"
  WHERE (("albums"."id" = "album_likes"."album_id") AND (("albums"."is_public" = true) OR ("albums"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) AND ("albums"."deleted_at" IS NULL)))));



CREATE POLICY "Anyone can create RSVPs" ON "public"."events_rsvps" FOR INSERT WITH CHECK (true);



CREATE POLICY "Authenticated users can add event comments" ON "public"."event_comments" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can insert interests" ON "public"."interests" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can insert tags" ON "public"."tags" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can like albums" ON "public"."album_likes" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can like photos" ON "public"."photo_likes" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can update interests" ON "public"."interests" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can update tags" ON "public"."tags" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Comments are publicly readable" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "Delete album comment links" ON "public"."album_comments" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."comments" "c"
  WHERE (("c"."id" = "album_comments"."comment_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Delete albums policy" ON "public"."albums" FOR DELETE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Delete photo comment links" ON "public"."photo_comments" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."comments" "c"
  WHERE (("c"."id" = "photo_comments"."comment_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Email types are viewable by everyone" ON "public"."email_types" FOR SELECT USING (true);



CREATE POLICY "Event comments are viewable by everyone" ON "public"."event_comments" FOR SELECT USING (true);



CREATE POLICY "Events are viewable by everyone" ON "public"."events" FOR SELECT USING (true);



CREATE POLICY "Insert album comment links" ON "public"."album_comments" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Insert email preferences policy" ON "public"."email_preferences" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Insert photo comment links" ON "public"."photo_comments" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Interests are viewable by everyone" ON "public"."interests" FOR SELECT USING (true);



CREATE POLICY "Only admins can create events" ON "public"."events" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Only admins can delete events" ON "public"."events" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Only admins can update events" ON "public"."events" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Photo likes are publicly readable" ON "public"."photo_likes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."photos"
  WHERE (("photos"."id" = "photo_likes"."photo_id") AND (("photos"."is_public" = true) OR ("photos"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))))))));



CREATE POLICY "Profile interests are viewable by everyone" ON "public"."profile_interests" FOR SELECT USING (true);



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Select RSVPs policy" ON "public"."events_rsvps" FOR SELECT USING (((("confirmed_at" IS NOT NULL) AND ("canceled_at" IS NULL)) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Select album photos policy" ON "public"."album_photos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."albums"
  WHERE (("albums"."id" = "album_photos"."album_id") AND (("albums"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("albums"."is_public" = true) AND (("albums"."is_suspended" IS NULL) OR ("albums"."is_suspended" = false))) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))))))));



CREATE POLICY "Select album tags policy" ON "public"."album_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."albums"
  WHERE (("albums"."id" = "album_tags"."album_id") AND (("albums"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("albums"."is_public" = true) AND (("albums"."is_suspended" IS NULL) OR ("albums"."is_suspended" = false))) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))))))));



CREATE POLICY "Select albums policy" ON "public"."albums" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("is_public" = true) AND (("is_suspended" IS NULL) OR ("is_suspended" = false))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Select email preferences policy" ON "public"."email_preferences" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Service role only" ON "public"."auth_tokens" USING (false) WITH CHECK (false);



CREATE POLICY "Tags are viewable by everyone" ON "public"."tags" FOR SELECT USING (true);



CREATE POLICY "Update RSVPs policy" ON "public"."events_rsvps" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Update albums policy" ON "public"."albums" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Update email preferences policy" ON "public"."email_preferences" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Users can add interests to their own profile" ON "public"."profile_interests" FOR INSERT WITH CHECK (("profile_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can add photos to their own albums" ON "public"."album_photos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."albums"
  WHERE (("albums"."id" = "album_photos"."album_id") AND ("albums"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can add tags to their own albums" ON "public"."album_tags" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."albums"
  WHERE (("albums"."id" = "album_tags"."album_id") AND ("albums"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can add tags to their own photos" ON "public"."photo_tags" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."photos"
  WHERE (("photos"."id" = "photo_tags"."photo_id") AND ("photos"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create their own albums" ON "public"."albums" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete interests from their own profile" ON "public"."profile_interests" FOR DELETE USING (("profile_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own comments" ON "public"."comments" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own photos" ON "public"."photos" FOR DELETE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Users can delete photos from their own albums" ON "public"."album_photos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."albums"
  WHERE (("albums"."id" = "album_photos"."album_id") AND ("albums"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete tags from their own albums" ON "public"."album_tags" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."albums"
  WHERE (("albums"."id" = "album_tags"."album_id") AND ("albums"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete tags from their own photos" ON "public"."photo_tags" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."photos"
  WHERE (("photos"."id" = "photo_tags"."photo_id") AND ("photos"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert own comments" ON "public"."comments" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own photos" ON "public"."photos" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can mark own notifications as seen" ON "public"."notifications" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can read own notifications" ON "public"."notifications" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can unlike their own album likes" ON "public"."album_likes" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can unlike their own photo likes" ON "public"."photo_likes" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own comments" ON "public"."comments" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own photos" ON "public"."photos" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update photos in their own albums" ON "public"."album_photos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."albums"
  WHERE (("albums"."id" = "album_photos"."album_id") AND ("albums"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view tags from public photos or their own photos" ON "public"."photo_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."photos"
  WHERE (("photos"."id" = "photo_tags"."photo_id") AND ((("photos"."is_public" = true) AND ("photos"."deleted_at" IS NULL)) OR ("photos"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users or admins can delete event comments" ON "public"."event_comments" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."comments"
  WHERE (("comments"."id" = "event_comments"."comment_id") AND ("comments"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "View album comment links" ON "public"."album_comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."albums"
  WHERE (("albums"."id" = "album_comments"."album_id") AND (("albums"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("albums"."is_public" = true) AND (("albums"."is_suspended" IS NULL) OR ("albums"."is_suspended" = false))) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))))))));



CREATE POLICY "View photo comment links" ON "public"."photo_comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."photos"
  WHERE (("photos"."id" = "photo_comments"."photo_id") AND (("photos"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("photos"."is_public" = true) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))))))));



CREATE POLICY "View public or own photos" ON "public"."photos" FOR SELECT USING ((("is_public" = true) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



ALTER TABLE "public"."album_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."album_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."album_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."album_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."albums" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events_rsvps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."photo_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."photo_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."photo_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_interests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";















































































































































































































GRANT ALL ON FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_delete_album"("p_album_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."admin_delete_album"("p_album_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_delete_album"("p_album_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_delete_album"("p_album_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_assign_album_photo_sort_order"() TO "postgres";
GRANT ALL ON FUNCTION "public"."auto_assign_album_photo_sort_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_assign_album_photo_sort_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_assign_album_photo_sort_order"() TO "service_role";



GRANT ALL ON FUNCTION "public"."batch_update_album_photos"("photo_updates" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."batch_update_album_photos"("photo_updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."batch_update_album_photos"("photo_updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."batch_update_album_photos"("photo_updates" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."batch_update_photos"("photo_updates" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."batch_update_photos"("photo_updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."batch_update_photos"("photo_updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."batch_update_photos"("photo_updates" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_delete_photos"("p_photo_ids" "uuid"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."bulk_delete_photos"("p_photo_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_delete_photos"("p_photo_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_delete_photos"("p_photo_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_remove_from_album"("p_album_photo_ids" "uuid"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."bulk_remove_from_album"("p_album_photo_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_remove_from_album"("p_album_photo_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_remove_from_album"("p_album_photo_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_auth_tokens"() TO "postgres";
GRANT ALL ON FUNCTION "public"."cleanup_expired_auth_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_auth_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_auth_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_album"("p_album_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."delete_album"("p_album_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_album"("p_album_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_album"("p_album_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_short_id"("size" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."generate_short_id"("size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_short_id"("size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_short_id"("size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_album_photo_count"("album_uuid" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."get_album_photo_count"("album_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_album_photo_count"("album_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_album_photo_count"("album_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_album_photos_count"("user_uuid" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."get_user_album_photos_count"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_album_photos_count"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_album_photos_count"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "postgres";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_view_count"("p_entity_type" "text", "p_entity_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."increment_view_count"("p_entity_type" "text", "p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_view_count"("p_entity_type" "text", "p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_view_count"("p_entity_type" "text", "p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_album"("p_album_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."restore_album"("p_album_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_album"("p_album_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_album"("p_album_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_comment"("p_comment_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."restore_comment"("p_comment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_comment"("p_comment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_comment"("p_comment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_photo"("p_photo_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."restore_photo"("p_photo_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_photo"("p_photo_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_photo"("p_photo_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_photo_sort_order"() TO "postgres";
GRANT ALL ON FUNCTION "public"."set_photo_sort_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_photo_sort_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_photo_sort_order"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_album_comments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_album_comments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_album_comments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_album_cover"() TO "postgres";
GRANT ALL ON FUNCTION "public"."update_album_cover"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_album_cover"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_album_cover"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_album_likes_count"() TO "postgres";
GRANT ALL ON FUNCTION "public"."update_album_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_album_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_album_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_comments_updated_at"() TO "postgres";
GRANT ALL ON FUNCTION "public"."update_comments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_comments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_interest_count"() TO "postgres";
GRANT ALL ON FUNCTION "public"."update_interest_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_interest_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_interest_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_photo_likes_count"() TO "postgres";
GRANT ALL ON FUNCTION "public"."update_photo_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_photo_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_photo_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tag_count"() TO "postgres";
GRANT ALL ON FUNCTION "public"."update_tag_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tag_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tag_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_comments" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_comments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_comments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_comments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_likes" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_likes" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_likes" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_likes" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_photos" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_photos" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_photos" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photos" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photos" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photos" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photos" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_photos_active" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_photos_active" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_photos_active" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_photos_active" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_tags" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_tags" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_tags" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."albums" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."albums" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."albums" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."auth_tokens" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."auth_tokens" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."auth_tokens" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."auth_tokens" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."comments" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."comments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."comments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."comments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_preferences" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_preferences" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_preferences" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_preferences" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_types" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_types" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_types" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."email_types_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."email_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."email_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."email_types_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."event_announcements" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."event_announcements" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."event_announcements" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."event_announcements" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."event_comments" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."event_comments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."event_comments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."event_comments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."events" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."events" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."events_rsvps" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."events_rsvps" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."events_rsvps" TO "service_role";



GRANT ALL ON SEQUENCE "public"."events_rsvps_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_rsvps_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_rsvps_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."interests" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."interests" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."interests" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."interests" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."notifications" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."notifications" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."notifications" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."notifications" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_comments" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_comments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_comments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_comments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_likes" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_likes" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_likes" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_likes" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_tags" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_tags" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_tags" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_tags" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profile_interests" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profile_interests" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profile_interests" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profile_interests" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tags" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tags" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tags" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tags" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";































