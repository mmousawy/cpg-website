


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






CREATE TYPE "public"."license_type" AS ENUM (
    'all-rights-reserved',
    'cc-by-nc-nd-4.0',
    'cc-by-nc-4.0',
    'cc-by-4.0',
    'cc0'
);


ALTER TYPE "public"."license_type" OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."add_challenge_comment"("p_challenge_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_comment_id UUID;
  v_user_id UUID;
  v_actual_parent_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify challenge exists
  IF NOT EXISTS (SELECT 1 FROM "public"."challenges" WHERE id = p_challenge_id) THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  -- If replying, validate parent comment exists and is not deleted
  IF p_parent_comment_id IS NOT NULL THEN
    -- Get the parent comment and flatten to original parent if it's already a reply
    SELECT COALESCE(parent_comment_id, id) INTO v_actual_parent_id
    FROM "public"."comments"
    WHERE id = p_parent_comment_id
      AND deleted_at IS NULL;

    IF v_actual_parent_id IS NULL THEN
      RAISE EXCEPTION 'Parent comment not found or deleted';
    END IF;
  END IF;

  -- Create the comment with parent_comment_id if replying
  INSERT INTO "public"."comments" (user_id, comment_text, parent_comment_id)
  VALUES (v_user_id, p_comment_text, v_actual_parent_id)
  RETURNING id INTO v_comment_id;

  -- Link to challenge (even for replies, so they show up in challenge queries)
  INSERT INTO "public"."challenge_comments" (challenge_id, comment_id)
  VALUES (p_challenge_id, v_comment_id);

  RETURN v_comment_id;
END;
$$;


ALTER FUNCTION "public"."add_challenge_comment"("p_challenge_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."add_challenge_comment"("p_challenge_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid") IS 'Creates a comment and links it to a challenge. Supports replies via optional p_parent_comment_id parameter.';



CREATE OR REPLACE FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_comment_id UUID;
  v_user_id UUID;
  v_actual_parent_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If replying, validate parent comment exists and is not deleted
  IF p_parent_comment_id IS NOT NULL THEN
    -- Get the parent comment and flatten to original parent if it's already a reply
    SELECT COALESCE(parent_comment_id, id) INTO v_actual_parent_id
    FROM comments
    WHERE id = p_parent_comment_id
      AND deleted_at IS NULL;

    IF v_actual_parent_id IS NULL THEN
      RAISE EXCEPTION 'Parent comment not found or deleted';
    END IF;
  END IF;

  -- Insert the comment with parent_comment_id if replying
  INSERT INTO comments (user_id, comment_text, parent_comment_id)
  VALUES (v_user_id, p_comment_text, v_actual_parent_id)
  RETURNING id INTO v_comment_id;

  -- Link to the appropriate entity (even for replies, so they show up in entity queries)
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


ALTER FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid") IS 'Atomically creates a comment and links it to an album or photo. Supports replies via optional p_parent_comment_id parameter.';



CREATE OR REPLACE FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text", "p_parent_comment_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_comment_id UUID;
  v_user_id UUID;
  v_actual_parent_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If replying, validate parent comment exists and is not deleted
  IF p_parent_comment_id IS NOT NULL THEN
    -- Get the parent comment and flatten to original parent if it's already a reply
    SELECT COALESCE(parent_comment_id, id) INTO v_actual_parent_id
    FROM comments
    WHERE id = p_parent_comment_id
      AND deleted_at IS NULL;

    IF v_actual_parent_id IS NULL THEN
      RAISE EXCEPTION 'Parent comment not found or deleted';
    END IF;
  END IF;

  -- Insert the comment with parent_comment_id if replying
  INSERT INTO comments (user_id, comment_text, parent_comment_id)
  VALUES (v_user_id, p_comment_text, v_actual_parent_id)
  RETURNING id INTO v_comment_id;

  -- Link to the event (even for replies, so they show up in event queries)
  INSERT INTO event_comments (event_id, comment_id)
  VALUES (p_event_id, v_comment_id);

  RETURN v_comment_id;
END;
$$;


ALTER FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text", "p_parent_comment_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text", "p_parent_comment_id" "uuid") IS 'Creates a comment and links it to an event. Supports replies via optional p_parent_comment_id parameter.';



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
  -- Note: width/height removed - use photos table via view/join
  FOR v_photo IN 
    SELECT p.id, p.url
    FROM unnest(p_photo_ids) WITH ORDINALITY AS input_photo(id, input_order)
    JOIN photos p ON p.id = input_photo.id
    WHERE p.user_id = v_user_id
      AND NOT EXISTS (
        SELECT 1 FROM album_photos ap 
        WHERE ap.album_id = p_album_id AND ap.photo_id = p.id
      )
    ORDER BY input_photo.input_order
  LOOP
    -- Insert with photo_url for backward compatibility (cover logic uses it)
    -- width/height are no longer written - they're redundant
    INSERT INTO album_photos (album_id, photo_id, photo_url, sort_order)
    VALUES (p_album_id, v_photo.id, v_photo.url, v_current_sort);
    
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


COMMENT ON FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) IS 'Adds photos to album. Width/height now read from photos table via view.';



CREATE OR REPLACE FUNCTION "public"."add_photos_to_shared_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_album record;
  v_photo_id uuid;
  v_inserted int := 0;
  v_max_sort int;
  v_current_count int;
  v_photo record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT a.id, a.user_id, a.event_id, a.max_photos_per_user
  INTO v_album
  FROM "public"."albums" a
  WHERE a.id = p_album_id AND a.is_shared = true AND a.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shared album not found';
  END IF;

  -- Access check: event album = any authenticated user, else must be active shared member or admin
  IF v_album.event_id IS NOT NULL THEN
    NULL; -- any authenticated user can add
  ELSIF v_album.user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "public"."shared_album_members" m
    WHERE m.album_id = p_album_id AND m.user_id = v_user_id
  ) AND v_album.user_id <> v_user_id THEN
    IF NOT (SELECT is_admin FROM "public"."profiles" WHERE id = v_user_id) THEN
      RAISE EXCEPTION 'Must be a member to add photos to this album';
    END IF;
  ELSIF v_album.user_id IS NULL AND NOT EXISTS (
    SELECT 1 FROM "public"."shared_album_members" m
    WHERE m.album_id = p_album_id AND m.user_id = v_user_id
  ) AND NOT (SELECT is_admin FROM "public"."profiles" WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Must be a member to add photos to this album';
  END IF;

  SELECT COALESCE(MAX(ap.sort_order), -1) INTO v_max_sort
  FROM "public"."album_photos" ap
  WHERE ap.album_id = p_album_id;

  FOREACH v_photo_id IN ARRAY p_photo_ids
  LOOP
    SELECT p.id, p.url, p.width, p.height INTO v_photo
    FROM "public"."photos" p
    WHERE p.id = v_photo_id AND p.user_id = v_user_id AND p.deleted_at IS NULL;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM "public"."album_photos" ap
      WHERE ap.album_id = p_album_id AND ap.photo_id = v_photo_id
    ) THEN
      CONTINUE;
    END IF;

    IF v_album.max_photos_per_user IS NOT NULL THEN
      SELECT COUNT(*) INTO v_current_count
      FROM "public"."album_photos" ap
      WHERE ap.album_id = p_album_id AND ap.added_by = v_user_id;
      IF v_current_count >= v_album.max_photos_per_user THEN
        RAISE EXCEPTION 'Photo limit reached for this album (% per user)', v_album.max_photos_per_user;
      END IF;
    END IF;

    v_max_sort := v_max_sort + 1;
    INSERT INTO "public"."album_photos" (album_id, photo_id, photo_url, width, height, sort_order, added_by)
    VALUES (p_album_id, v_photo.id, v_photo.url, v_photo.width, v_photo.height, v_max_sort, v_user_id);
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;


ALTER FUNCTION "public"."add_photos_to_shared_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."add_photos_to_shared_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) IS 'Add photos to a shared or event album';



CREATE OR REPLACE FUNCTION "public"."add_shared_album_owner"("p_album_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid;
  v_album_owner_id uuid;
  v_is_shared boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT a.user_id, a.is_shared
  INTO v_album_owner_id, v_is_shared
  FROM "public"."albums" a
  WHERE a.id = p_album_id AND a.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Album not found';
  END IF;

  IF v_album_owner_id IS NULL THEN
    RAISE EXCEPTION 'Event albums have no owner';
  END IF;

  IF v_album_owner_id <> v_user_id THEN
    RAISE EXCEPTION 'Only the album owner can add themselves as shared album owner';
  END IF;

  IF NOT v_is_shared THEN
    RAISE EXCEPTION 'Album must be shared to add owner as member';
  END IF;

  INSERT INTO "public"."shared_album_members" (album_id, user_id, role)
  VALUES (p_album_id, v_user_id, 'owner')
  ON CONFLICT (album_id, user_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."add_shared_album_owner"("p_album_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."add_shared_album_owner"("p_album_id" "uuid") IS 'Add album owner to shared_album_members when converting personal album to shared';



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
  v_is_admin boolean;
BEGIN
  SELECT a.user_id INTO album_user_id
  FROM public.album_photos ap
  JOIN public.albums a ON a.id = ap.album_id
  WHERE ap.id = ((photo_updates->0)->>'id')::uuid
  LIMIT 1;

  -- Allow if owner, or admin (including for ownerless event albums)
  IF (album_user_id IS NOT NULL AND album_user_id = auth.uid()) OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) THEN
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


COMMENT ON FUNCTION "public"."batch_update_album_photos"("photo_updates" "jsonb") IS 'Batch update album photo titles/sort order (owner or admin)';



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
    sort_order = COALESCE((update_item->>'sort_order')::int, public.photos.sort_order),
    license = COALESCE((update_item->>'license')::public.license_type, public.photos.license)
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
  v_is_admin BOOLEAN;
  v_deleted_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT a.user_id INTO v_album_user_id
  FROM album_photos ap
  JOIN albums a ON a.id = ap.album_id
  WHERE ap.id = ANY(p_album_photo_ids)
  LIMIT 1;

  IF v_album_user_id IS NULL THEN
    -- Album not found or ownerless (event album): allow only admin
    IF NOT (SELECT is_admin FROM profiles WHERE id = v_user_id) THEN
      RAISE EXCEPTION 'Not authorized to modify this album';
    END IF;
  ELSE
    -- Allow if owner or admin
    IF v_album_user_id != v_user_id THEN
      SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_user_id;
      IF NOT COALESCE(v_is_admin, false) THEN
        RAISE EXCEPTION 'Not authorized to modify this album';
      END IF;
    END IF;
  END IF;

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


COMMENT ON FUNCTION "public"."bulk_remove_from_album"("p_album_photo_ids" "uuid"[]) IS 'Removes multiple photos from an album (owner or admin)';



CREATE OR REPLACE FUNCTION "public"."bulk_review_challenge_submissions"("p_submission_ids" "uuid"[], "p_status" "text", "p_rejection_reason" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_updated INTEGER := 0;
BEGIN
    -- Verify user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify user is admin
    SELECT is_admin INTO v_is_admin
    FROM "public"."profiles"
    WHERE id = v_user_id;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    -- Validate status
    IF p_status NOT IN ('pending', 'accepted', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be pending, accepted, or rejected';
    END IF;

    -- Update submissions
    UPDATE "public"."challenge_submissions"
    SET status = p_status,
        reviewed_at = now(),
        reviewed_by = v_user_id,
        rejection_reason = CASE WHEN p_status = 'rejected' THEN p_rejection_reason ELSE NULL END
    WHERE id = ANY(p_submission_ids);

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;


ALTER FUNCTION "public"."bulk_review_challenge_submissions"("p_submission_ids" "uuid"[], "p_status" "text", "p_rejection_reason" "text") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."bulk_review_challenge_submissions"("p_submission_ids" "uuid"[], "p_status" "text", "p_rejection_reason" "text") IS 'Bulk review challenge submissions (admin only)';



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


CREATE OR REPLACE FUNCTION "public"."create_event_album"("p_event_id" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_event record;
  v_album_id uuid;
  v_slug text;
BEGIN
  SELECT e.id, e.title, e.slug, e.date INTO v_event
  FROM "public"."events" e
  WHERE e.id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  SELECT a.id INTO v_album_id
  FROM "public"."albums" a
  WHERE a.event_id = p_event_id AND a.deleted_at IS NULL;

  IF FOUND THEN
    RETURN v_album_id;
  END IF;

  v_slug := 'event-' || p_event_id || '-photos';

  INSERT INTO "public"."albums" (
    user_id, title, slug, description,
    is_shared, join_policy, event_id, created_by_system, is_public,
    created_at
  )
  VALUES (
    NULL,
    v_event.title || ' Photos',
    v_slug,
    'Photos from this event. Add your own!',
    true,
    NULL,
    p_event_id,
    true,
    true,
    COALESCE(v_event.date::timestamptz, now())
  )
  RETURNING id INTO v_album_id;

  RETURN v_album_id;
END;
$$;


ALTER FUNCTION "public"."create_event_album"("p_event_id" integer) OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."create_event_album"("p_event_id" integer) IS 'Create or return existing event album (idempotent). Sets created_at to the event date.';



CREATE OR REPLACE FUNCTION "public"."delete_album"("p_album_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_album_user_id UUID;
  v_comment_ids UUID[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id INTO v_album_user_id
  FROM albums
  WHERE id = p_album_id AND deleted_at IS NULL;

  IF v_album_user_id IS NULL THEN
    -- Album not found or ownerless (event album)
    IF EXISTS (SELECT 1 FROM albums WHERE id = p_album_id AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'Event albums cannot be deleted via this action. Use admin delete.';
    END IF;
    RETURN FALSE;
  END IF;

  IF v_album_user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to delete this album';
  END IF;

  SELECT ARRAY_AGG(ac.comment_id) INTO v_comment_ids
  FROM album_comments ac
  JOIN comments c ON c.id = ac.comment_id
  WHERE ac.album_id = p_album_id AND c.deleted_at IS NULL;

  IF v_comment_ids IS NOT NULL AND array_length(v_comment_ids, 1) > 0 THEN
    UPDATE comments SET deleted_at = NOW() WHERE id = ANY(v_comment_ids) AND deleted_at IS NULL;
  END IF;

  UPDATE albums SET deleted_at = NOW() WHERE id = p_album_id;
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


CREATE OR REPLACE FUNCTION "public"."get_profile_stats"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN jsonb_build_object(
    'eventsAttended', (
      SELECT COUNT(*)::int FROM events_rsvps 
      WHERE user_id = p_user_id 
        AND attended_at IS NOT NULL 
        AND confirmed_at IS NOT NULL 
        AND canceled_at IS NULL
    ),
    'commentsMade', (
      SELECT COUNT(*)::int FROM comments 
      WHERE user_id = p_user_id AND deleted_at IS NULL
    ),
    'likesReceived', (
      COALESCE((
        SELECT SUM(likes_count)::int FROM albums 
        WHERE user_id = p_user_id AND is_public = true AND deleted_at IS NULL
      ), 0) +
      COALESCE((
        SELECT SUM(likes_count)::int FROM photos 
        WHERE user_id = p_user_id AND is_public = true AND deleted_at IS NULL
      ), 0)
    ),
    'viewsReceived', (
      COALESCE((
        SELECT SUM(view_count)::int FROM albums 
        WHERE user_id = p_user_id AND is_public = true AND deleted_at IS NULL
      ), 0) +
      COALESCE((
        SELECT SUM(view_count)::int FROM photos 
        WHERE user_id = p_user_id AND is_public = true AND deleted_at IS NULL
      ), 0)
    ),
    'challengesParticipated', (
      SELECT COUNT(DISTINCT cs.challenge_id)::int FROM challenge_submissions cs
      JOIN photos p ON p.id = cs.photo_id
      WHERE cs.user_id = p_user_id AND p.deleted_at IS NULL
    ),
    'challengePhotosAccepted', (
      SELECT COUNT(*)::int FROM challenge_submissions cs
      JOIN photos p ON p.id = cs.photo_id
      WHERE cs.user_id = p_user_id AND cs.status = 'accepted' AND p.deleted_at IS NULL
    )
  );
END;
$$;


ALTER FUNCTION "public"."get_profile_stats"("p_user_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."get_profile_stats"("p_user_id" "uuid") IS 'Returns public profile stats in a single query. Replaces 12+ individual queries. Used by getProfileStats().';



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


CREATE OR REPLACE FUNCTION "public"."get_user_stats"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_album_ids uuid[];
  v_photo_ids uuid[];
  v_result jsonb;
BEGIN
  -- Get user's album IDs once (reused multiple times)
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_album_ids
  FROM albums 
  WHERE user_id = p_user_id AND deleted_at IS NULL;
  
  -- Get user's photo IDs from those albums
  IF array_length(v_album_ids, 1) > 0 THEN
    SELECT COALESCE(array_agg(DISTINCT ap.photo_id), ARRAY[]::uuid[]) INTO v_photo_ids
    FROM album_photos ap
    JOIN photos p ON p.id = ap.photo_id
    WHERE ap.album_id = ANY(v_album_ids) AND p.deleted_at IS NULL;
  ELSE
    v_photo_ids := ARRAY[]::uuid[];
  END IF;

  -- Build result JSON with all stats
  SELECT jsonb_build_object(
    'albums', COALESCE(array_length(v_album_ids, 1), 0),
    'photos', COALESCE(array_length(v_photo_ids, 1), 0),
    'commentsMade', (
      SELECT COUNT(*)::int FROM comments 
      WHERE user_id = p_user_id AND deleted_at IS NULL
    ),
    'commentsReceived', (
      SELECT COUNT(*)::int FROM comments c
      WHERE c.deleted_at IS NULL 
        AND c.user_id != p_user_id 
        AND (
          c.id IN (SELECT comment_id FROM album_comments WHERE album_id = ANY(v_album_ids))
          OR c.id IN (SELECT comment_id FROM photo_comments WHERE photo_id = ANY(v_photo_ids))
        )
    ),
    'likesReceived', (
      COALESCE((SELECT SUM(likes_count)::int FROM albums WHERE user_id = p_user_id AND deleted_at IS NULL), 0) +
      COALESCE((SELECT SUM(p.likes_count)::int FROM photos p WHERE p.id = ANY(v_photo_ids) AND p.deleted_at IS NULL), 0)
    ),
    'likesMade', (
      (SELECT COUNT(*)::int FROM album_likes al
       JOIN albums a ON a.id = al.album_id
       WHERE al.user_id = p_user_id AND a.deleted_at IS NULL) +
      (SELECT COUNT(*)::int FROM photo_likes pl
       JOIN photos p ON p.id = pl.photo_id
       WHERE pl.user_id = p_user_id AND p.deleted_at IS NULL)
    ),
    'viewsReceived', (
      COALESCE((SELECT SUM(view_count)::int FROM albums WHERE user_id = p_user_id AND deleted_at IS NULL), 0) +
      COALESCE((SELECT SUM(p.view_count)::int FROM photos p WHERE p.id = ANY(v_photo_ids) AND p.deleted_at IS NULL), 0)
    ),
    'rsvpsConfirmed', (
      SELECT COUNT(*)::int FROM events_rsvps 
      WHERE user_id = p_user_id AND confirmed_at IS NOT NULL AND canceled_at IS NULL
    ),
    'rsvpsCanceled', (
      SELECT COUNT(*)::int FROM events_rsvps 
      WHERE user_id = p_user_id AND canceled_at IS NOT NULL
    ),
    'eventsAttended', (
      SELECT COUNT(*)::int FROM events_rsvps 
      WHERE user_id = p_user_id 
        AND attended_at IS NOT NULL 
        AND confirmed_at IS NOT NULL 
        AND canceled_at IS NULL
    ),
    'challengesParticipated', (
      SELECT COUNT(DISTINCT cs.challenge_id)::int FROM challenge_submissions cs
      JOIN photos p ON p.id = cs.photo_id
      WHERE cs.user_id = p_user_id AND p.deleted_at IS NULL
    ),
    'challengePhotosAccepted', (
      SELECT COUNT(*)::int FROM challenge_submissions cs
      JOIN photos p ON p.id = cs.photo_id
      WHERE cs.user_id = p_user_id AND cs.status = 'accepted' AND p.deleted_at IS NULL
    ),
    'memberSince', (
      SELECT created_at FROM profiles WHERE id = p_user_id
    ),
    'lastLoggedIn', (
      SELECT last_logged_in FROM profiles WHERE id = p_user_id
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_user_stats"("p_user_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."get_user_stats"("p_user_id" "uuid") IS 'Returns all user account stats in a single query. Replaces 15+ individual queries. Used by /api/account/stats.';



CREATE OR REPLACE FUNCTION "public"."global_search"("search_query" "text", "result_limit" integer DEFAULT 20, "search_types" "text"[] DEFAULT ARRAY['albums'::"text", 'photos'::"text", 'members'::"text", 'events'::"text", 'tags'::"text"]) RETURNS TABLE("entity_type" "text", "entity_id" "text", "title" "text", "subtitle" "text", "image_url" "text", "url" "text", "rank" real)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH search_tsquery AS (
    SELECT to_tsquery('english',
      regexp_replace(
        regexp_replace(search_query, '\s+', ' & ', 'g'),
        '(\w+)', '\1:*', 'g'
      )
    ) AS query
  ),
  all_results AS (
    SELECT
      'members'::text AS entity_type,
      p.id::text AS entity_id,
      COALESCE(p.full_name, p.nickname, 'Unknown') AS title,
      CASE WHEN p.nickname IS NOT NULL THEN '@' || p.nickname ELSE '' END AS subtitle,
      p.avatar_url AS image_url,
      CASE WHEN p.nickname IS NOT NULL THEN '/@' || p.nickname ELSE NULL END AS url,
      ts_rank(p.search_vector, sq.query) AS rank
    FROM profiles p
    CROSS JOIN search_tsquery sq
    WHERE 'members' = ANY(search_types)
      AND p.suspended_at IS NULL
      AND p.nickname IS NOT NULL
      AND p.search_vector @@ sq.query

    UNION ALL

    SELECT
      'albums'::text AS entity_type,
      a.id::text AS entity_id,
      a.title AS title,
      COALESCE(
        (SELECT COUNT(*)::text || ' photo' || CASE WHEN COUNT(*) != 1 THEN 's' ELSE '' END
         FROM album_photos_active ap WHERE ap.album_id = a.id),
        '0 photos'
      ) AS subtitle,
      a.cover_image_url AS image_url,
      CASE
        WHEN p.nickname IS NOT NULL THEN '/@' || p.nickname || '/album/' || a.slug
        WHEN a.event_id IS NOT NULL THEN '/events/' || (SELECT slug FROM events WHERE id = a.event_id) || '#photos'
        ELSE NULL
      END AS url,
      ts_rank(a.search_vector, sq.query) AS rank
    FROM albums a
    LEFT JOIN profiles p ON p.id = a.user_id
    CROSS JOIN search_tsquery sq
    WHERE 'albums' = ANY(search_types)
      AND a.is_public = true
      AND a.deleted_at IS NULL
      AND (a.is_suspended = false OR a.is_suspended IS NULL)
      AND (p.suspended_at IS NULL OR p.id IS NULL)
      AND a.search_vector @@ sq.query

    UNION ALL

    SELECT
      'photos'::text AS entity_type,
      ph.id::text AS entity_id,
      COALESCE(ph.title, 'Untitled Photo') AS title,
      COALESCE(ph.description, '') AS subtitle,
      ph.url AS image_url,
      CASE WHEN p.nickname IS NOT NULL THEN '/@' || p.nickname || '/photo/' || ph.short_id ELSE NULL END AS url,
      ts_rank(ph.search_vector, sq.query) AS rank
    FROM photos ph
    JOIN profiles p ON p.id = ph.user_id
    CROSS JOIN search_tsquery sq
    WHERE 'photos' = ANY(search_types)
      AND ph.is_public = true
      AND ph.deleted_at IS NULL
      AND p.suspended_at IS NULL
      AND ph.search_vector @@ sq.query

    UNION ALL

    SELECT
      'events'::text AS entity_type,
      e.id::text AS entity_id,
      COALESCE(e.title, 'Untitled Event') AS title,
      COALESCE(e.location, '') AS subtitle,
      e.cover_image AS image_url,
      '/events/' || e.slug AS url,
      ts_rank(e.search_vector, sq.query) AS rank
    FROM events e
    CROSS JOIN search_tsquery sq
    WHERE 'events' = ANY(search_types)
      AND e.search_vector @@ sq.query

    UNION ALL

    SELECT
      'tags'::text AS entity_type,
      at.tag AS entity_id,
      at.tag AS title,
      (
        SELECT COUNT(DISTINCT ap.photo_id)::text || ' photo' ||
               CASE WHEN COUNT(DISTINCT ap.photo_id) != 1 THEN 's' ELSE '' END
        FROM album_tags at2
        JOIN album_photos_active ap ON ap.album_id = at2.album_id
        JOIN albums a ON a.id = at2.album_id
        WHERE at2.tag = at.tag
          AND a.is_public = true
          AND a.deleted_at IS NULL
          AND (a.is_suspended = false OR a.is_suspended IS NULL)
      ) AS subtitle,
      NULL::text AS image_url,
      '/gallery/tag/' || at.tag AS url,
      CASE
        WHEN at.tag ILIKE search_query || '%' THEN 1.0::real
        WHEN at.tag ILIKE '%' || search_query || '%' THEN 0.5::real
        ELSE 0.1::real
      END AS rank
    FROM album_tags at
    WHERE 'tags' = ANY(search_types)
      AND (at.tag ILIKE search_query || '%' OR at.tag ILIKE '%' || search_query || '%')
    GROUP BY at.tag
  )
  SELECT
    entity_type,
    entity_id,
    title,
    subtitle,
    image_url,
    url,
    rank
  FROM all_results
  WHERE url IS NOT NULL
  ORDER BY rank DESC, title ASC
  LIMIT result_limit;
$$;


ALTER FUNCTION "public"."global_search"("search_query" "text", "result_limit" integer, "search_types" "text"[]) OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."global_search"("search_query" "text", "result_limit" integer, "search_types" "text"[]) IS 'Unified full-text search across albums, photos, members, events, and tags. Returns ranked results with entity metadata. Respects RLS policies.';



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
    -- Increment total view count
    UPDATE photos SET view_count = view_count + 1 WHERE id = p_entity_id;
    -- Log individual view with timestamp
    INSERT INTO photo_views (photo_id, viewed_at) VALUES (p_entity_id, NOW());
  ELSIF p_entity_type = 'album' THEN
    -- Increment total view count
    UPDATE albums SET view_count = view_count + 1 WHERE id = p_entity_id;
    -- Log individual view with timestamp
    INSERT INTO album_views (album_id, viewed_at) VALUES (p_entity_id, NOW());
  END IF;
END;
$$;


ALTER FUNCTION "public"."increment_view_count"("p_entity_type" "text", "p_entity_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."increment_view_count"("p_entity_type" "text", "p_entity_id" "uuid") IS 'Increments view_count and logs individual view events for weekly trending queries';



CREATE OR REPLACE FUNCTION "public"."invite_to_shared_album"("p_album_id" "uuid", "p_user_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_target_id uuid;
  v_created int := 0;
  v_skipped_member int := 0;
  v_skipped_pending int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT a.user_id INTO v_owner_id
  FROM "public"."albums" a
  WHERE a.id = p_album_id AND a.is_shared = true AND a.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shared album not found';
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Event albums do not support invites';
  END IF;

  IF v_owner_id <> v_user_id AND NOT (SELECT is_admin FROM "public"."profiles" WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Only the album owner can invite members';
  END IF;

  FOREACH v_target_id IN ARRAY p_user_ids
  LOOP
    IF v_target_id = v_owner_id THEN
      CONTINUE;
    END IF;
    IF EXISTS (
      SELECT 1 FROM "public"."shared_album_members" m
      WHERE m.album_id = p_album_id AND m.user_id = v_target_id
    ) THEN
      v_skipped_member := v_skipped_member + 1;
      CONTINUE;
    END IF;
    IF EXISTS (
      SELECT 1 FROM "public"."shared_album_requests" r
      WHERE r.album_id = p_album_id AND r.user_id = v_target_id AND r.status = 'pending'
    ) THEN
      v_skipped_pending := v_skipped_pending + 1;
      CONTINUE;
    END IF;
    INSERT INTO "public"."shared_album_requests" (album_id, user_id, type, initiated_by, status)
    VALUES (p_album_id, v_target_id, 'invite', v_user_id, 'pending');
    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'created', v_created,
    'skipped_existing_member', v_skipped_member,
    'skipped_pending', v_skipped_pending
  );
END;
$$;


ALTER FUNCTION "public"."invite_to_shared_album"("p_album_id" "uuid", "p_user_ids" "uuid"[]) OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."invite_to_shared_album"("p_album_id" "uuid", "p_user_ids" "uuid"[]) IS 'Invite users to a closed shared album';



CREATE OR REPLACE FUNCTION "public"."is_shared_album_member"("p_album_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_album_members m
    WHERE m.album_id = p_album_id AND m.user_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."is_shared_album_member"("p_album_id" "uuid", "p_user_id" "uuid") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."join_shared_album"("p_album_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_join_policy text;
  v_is_event boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT a.join_policy, (a.event_id IS NOT NULL)
  INTO v_join_policy, v_is_event
  FROM "public"."albums" a
  WHERE a.id = p_album_id AND a.is_shared = true AND a.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shared album not found';
  END IF;

  IF v_is_event THEN
    RAISE EXCEPTION 'Event albums do not support join';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."shared_album_members" m
    WHERE m.album_id = p_album_id AND m.user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('status', 'already_member');
  END IF;

  IF v_join_policy = 'open' THEN
    INSERT INTO "public"."shared_album_members" (album_id, user_id, role)
    VALUES (p_album_id, v_user_id, 'member');
    RETURN jsonb_build_object('status', 'joined');
  END IF;

  IF v_join_policy = 'closed' THEN
    IF EXISTS (
      SELECT 1 FROM "public"."shared_album_requests" r
      WHERE r.album_id = p_album_id AND r.user_id = v_user_id AND r.status = 'pending'
    ) THEN
      RETURN jsonb_build_object('status', 'already_requested');
    END IF;
    INSERT INTO "public"."shared_album_requests" (album_id, user_id, type, initiated_by, status)
    VALUES (p_album_id, v_user_id, 'request', v_user_id, 'pending');
    RETURN jsonb_build_object('status', 'requested');
  END IF;

  RAISE EXCEPTION 'Invalid join policy';
END;
$$;


ALTER FUNCTION "public"."join_shared_album"("p_album_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."join_shared_album"("p_album_id" "uuid") IS 'Join an open shared album or create a join request for a closed one';



CREATE OR REPLACE FUNCTION "public"."leave_shared_album"("p_album_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deleted int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM "public"."shared_album_members"
  WHERE album_id = p_album_id AND user_id = v_user_id AND role = 'member';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'Not a member or cannot leave (owner)';
  END IF;
END;
$$;


ALTER FUNCTION "public"."leave_shared_album"("p_album_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."leave_shared_album"("p_album_id" "uuid") IS 'Leave a shared album (members only, not owner)';



CREATE OR REPLACE FUNCTION "public"."prevent_private_challenge_photo"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- If changing is_public from true to false
    IF OLD.is_public = true AND NEW.is_public = false THEN
        -- Check if photo has any accepted challenge submissions
        IF EXISTS (
            SELECT 1 FROM "public"."challenge_submissions"
            WHERE photo_id = NEW.id
              AND status = 'accepted'
        ) THEN
            RAISE EXCEPTION 'Cannot make photo private: it is part of an accepted challenge submission. Withdraw from the challenge first.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_private_challenge_photo"() OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."prevent_private_challenge_photo"() IS 'Prevents photos with accepted challenge submissions from being made private';



CREATE OR REPLACE FUNCTION "public"."remove_album_member"("p_album_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_caller_id uuid;
  v_album record;
  v_is_admin boolean;
  v_deleted int;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT a.user_id, a.is_shared
  INTO v_album
  FROM "public"."albums" a
  WHERE a.id = p_album_id;

  IF v_album IS NULL THEN
    RAISE EXCEPTION 'Album not found';
  END IF;

  IF NOT v_album.is_shared THEN
    RAISE EXCEPTION 'Album is not shared';
  END IF;

  SELECT COALESCE(p.is_admin, false) INTO v_is_admin
  FROM "public"."profiles" p WHERE p.id = v_caller_id;

  -- Only the album owner or an admin can remove members. For event albums (user_id NULL), only admin.
  IF (v_album.user_id IS NOT NULL AND v_album.user_id <> v_caller_id) AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Only the album owner can remove members';
  END IF;
  IF v_album.user_id IS NULL AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Only an admin can remove members from event albums';
  END IF;

  -- Cannot remove the owner (only applies when there is an owner)
  IF v_album.user_id IS NOT NULL AND p_user_id = v_album.user_id THEN
    RAISE EXCEPTION 'Cannot remove the album owner';
  END IF;

  DELETE FROM "public"."shared_album_members"
  WHERE album_id = p_album_id AND user_id = p_user_id AND role = 'member';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  DELETE FROM "public"."album_photos"
  WHERE album_id = p_album_id AND added_by = p_user_id;
END;
$$;


ALTER FUNCTION "public"."remove_album_member"("p_album_id" "uuid", "p_user_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."remove_album_member"("p_album_id" "uuid", "p_user_id" "uuid") IS 'Remove a member from a shared album (owner/admin only)';



CREATE OR REPLACE FUNCTION "public"."remove_shared_album_photo"("p_album_id" "uuid", "p_album_photo_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_deleted int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT a.user_id INTO v_owner_id
  FROM "public"."albums" a
  WHERE a.id = p_album_id AND a.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Album not found';
  END IF;

  IF v_owner_id = v_user_id OR (SELECT is_admin FROM "public"."profiles" WHERE id = v_user_id) THEN
    DELETE FROM "public"."album_photos"
    WHERE album_id = p_album_id AND id = ANY(p_album_photo_ids);
  ELSE
    DELETE FROM "public"."album_photos"
    WHERE album_id = p_album_id AND id = ANY(p_album_photo_ids) AND added_by = v_user_id;
  END IF;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


ALTER FUNCTION "public"."remove_shared_album_photo"("p_album_id" "uuid", "p_album_photo_ids" "uuid"[]) OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."remove_shared_album_photo"("p_album_id" "uuid", "p_album_photo_ids" "uuid"[]) IS 'Remove photos from shared album (owner: any, member: own only)';



CREATE OR REPLACE FUNCTION "public"."resolve_album_request"("p_request_id" bigint, "p_action" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_req record;
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_action NOT IN ('accept', 'decline') THEN
    RAISE EXCEPTION 'Invalid action. Must be accept or decline';
  END IF;

  SELECT r.*, a.user_id AS owner_id
  INTO v_req
  FROM "public"."shared_album_requests" r
  JOIN "public"."albums" a ON a.id = r.album_id
  WHERE r.id = p_request_id AND r.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending request not found';
  END IF;

  IF v_req.owner_id IS NULL THEN
    RAISE EXCEPTION 'Cannot resolve request for event album';
  END IF;

  IF v_req.type = 'request' THEN
    IF v_actor <> v_req.owner_id AND NOT (SELECT is_admin FROM "public"."profiles" WHERE id = v_actor) THEN
      RAISE EXCEPTION 'Only owner can resolve join requests';
    END IF;
  ELSIF v_req.type = 'invite' THEN
    IF v_actor <> v_req.user_id AND v_actor <> v_req.owner_id AND NOT (SELECT is_admin FROM "public"."profiles" WHERE id = v_actor) THEN
      RAISE EXCEPTION 'Not authorized to resolve invite';
    END IF;
  END IF;

  UPDATE "public"."shared_album_requests"
  SET status = CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'declined' END,
      resolved_at = now()
  WHERE id = p_request_id;

  IF p_action = 'accept' THEN
    INSERT INTO "public"."shared_album_members" (album_id, user_id, role)
    VALUES (v_req.album_id, v_req.user_id, 'member')
    ON CONFLICT (album_id, user_id) DO NOTHING;
  END IF;
END;
$$;


ALTER FUNCTION "public"."resolve_album_request"("p_request_id" bigint, "p_action" "text") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."resolve_album_request"("p_request_id" bigint, "p_action" "text") IS 'Accept or decline an album invite/request';



CREATE OR REPLACE FUNCTION "public"."restore_album"("p_album_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_album_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id INTO v_album_user_id
  FROM albums
  WHERE id = p_album_id AND deleted_at IS NOT NULL;

  IF v_album_user_id IS NULL THEN
    -- Album not found or ownerless (event album): allow only admin
    IF NOT EXISTS (SELECT 1 FROM albums WHERE id = p_album_id AND deleted_at IS NOT NULL) THEN
      RETURN FALSE;
    END IF;
    IF NOT (SELECT is_admin FROM profiles WHERE id = v_user_id) THEN
      RAISE EXCEPTION 'Only an admin can restore event albums';
    END IF;
  ELSE
    IF v_album_user_id != v_user_id THEN
      RAISE EXCEPTION 'Not authorized to restore this album';
    END IF;
  END IF;

  UPDATE albums SET deleted_at = NULL WHERE id = p_album_id;
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



CREATE OR REPLACE FUNCTION "public"."review_challenge_submission"("p_submission_id" "uuid", "p_status" "text", "p_rejection_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    -- Verify user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify user is admin
    SELECT is_admin INTO v_is_admin
    FROM "public"."profiles"
    WHERE id = v_user_id;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    -- Validate status
    IF p_status NOT IN ('pending', 'accepted', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be pending, accepted, or rejected';
    END IF;

    -- Update submission
    UPDATE "public"."challenge_submissions"
    SET status = p_status,
        reviewed_at = now(),
        reviewed_by = v_user_id,
        rejection_reason = CASE WHEN p_status = 'rejected' THEN p_rejection_reason ELSE NULL END
    WHERE id = p_submission_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;
END;
$$;


ALTER FUNCTION "public"."review_challenge_submission"("p_submission_id" "uuid", "p_status" "text", "p_rejection_reason" "text") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."review_challenge_submission"("p_submission_id" "uuid", "p_status" "text", "p_rejection_reason" "text") IS 'Review a challenge submission (admin only)';



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


CREATE OR REPLACE FUNCTION "public"."submit_to_challenge"("p_challenge_id" "uuid", "p_photo_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_inserted INTEGER := 0;
    v_rejected_photo_id UUID;
BEGIN
    -- Verify user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify challenge is active and accepting submissions
    IF NOT EXISTS (
        SELECT 1 FROM "public"."challenges"
        WHERE id = p_challenge_id
          AND is_active = true
          AND (ends_at IS NULL OR ends_at > now())
    ) THEN
        RAISE EXCEPTION 'Challenge is not accepting submissions';
    END IF;

    -- Check if any of the photos were previously rejected for this challenge
    SELECT cs.photo_id INTO v_rejected_photo_id
    FROM "public"."challenge_submissions" cs
    WHERE cs.challenge_id = p_challenge_id
      AND cs.user_id = v_user_id
      AND cs.status = 'rejected'
      AND cs.photo_id = ANY(p_photo_ids)
    LIMIT 1;

    IF v_rejected_photo_id IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot resubmit a previously rejected photo';
    END IF;

    -- Insert submissions (only user's own photos, skip duplicates)
    INSERT INTO "public"."challenge_submissions" (challenge_id, photo_id, user_id)
    SELECT p_challenge_id, photo_id, v_user_id
    FROM unnest(p_photo_ids) AS photo_id
    WHERE EXISTS (
        SELECT 1 FROM "public"."photos"
        WHERE id = photo_id AND user_id = v_user_id AND deleted_at IS NULL
    )
    ON CONFLICT (challenge_id, photo_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$$;


ALTER FUNCTION "public"."submit_to_challenge"("p_challenge_id" "uuid", "p_photo_ids" "uuid"[]) OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."submit_to_challenge"("p_challenge_id" "uuid", "p_photo_ids" "uuid"[]) IS 'Submit photos to a challenge (user can only submit their own photos, rejected photos cannot be resubmitted)';



CREATE OR REPLACE FUNCTION "public"."trigger_add_shared_album_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.is_shared = true AND NEW.event_id IS NULL THEN
    INSERT INTO "public"."shared_album_members" (album_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (album_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_add_shared_album_owner"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."trigger_create_event_album"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM "public"."create_event_album"(NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_create_event_album"() OWNER TO "supabase_admin";


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
  
  -- Get the URL of the deleted photo from photos table
  SELECT p.url INTO deleted_photo_url
  FROM public.photos p
  WHERE p.id = OLD.photo_id;

  -- Check if the deleted photo was the cover photo
  IF EXISTS (
    SELECT 1 FROM public.albums
    WHERE id = target_album_id
      AND cover_image_url = deleted_photo_url
  ) THEN
    -- Get the first photo by sort_order for this album (excluding deleted photos)
    -- Use photos.url instead of album_photos.photo_url
    SELECT p.url INTO new_cover_url
    FROM public.album_photos ap
    JOIN public.photos p ON p.id = ap.photo_id
    WHERE ap.album_id = target_album_id
      AND p.deleted_at IS NULL
    ORDER BY ap.sort_order ASC NULLS LAST, ap.created_at ASC
    LIMIT 1;

    -- Update the album's cover image (set to NULL if no photos found)
    UPDATE public.albums
    SET cover_image_url = new_cover_url,
        updated_at = NOW()
    WHERE id = target_album_id;
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."update_album_cover"() OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."update_album_cover"() IS 'Updates album cover when cover photo is removed. Uses photos.url (not redundant column).';



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
    "sort_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "photo_id" "uuid" NOT NULL,
    "added_by" "uuid"
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
    "view_count" integer DEFAULT 0 NOT NULL,
    "search_vector" "tsvector" GENERATED ALWAYS AS ((("setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("title", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("description", ''::"text")), 'B'::"char")) || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("original_filename", ''::"text")), 'C'::"char"))) STORED,
    "license" "public"."license_type" DEFAULT 'all-rights-reserved'::"public"."license_type" NOT NULL,
    "copyright_notice" "text"
);


ALTER TABLE "public"."photos" OWNER TO "supabase_admin";


CREATE OR REPLACE VIEW "public"."album_photos_active" WITH ("security_invoker"='true') AS
 SELECT "ap"."id",
    "ap"."album_id",
    "p"."url" AS "photo_url",
    "ap"."title",
    "ap"."description",
    "p"."width",
    "p"."height",
    "ap"."sort_order",
    "ap"."created_at",
    "ap"."photo_id"
   FROM ("public"."album_photos" "ap"
     JOIN "public"."photos" "p" ON (("p"."id" = "ap"."photo_id")))
  WHERE ("p"."deleted_at" IS NULL);


ALTER VIEW "public"."album_photos_active" OWNER TO "supabase_admin";


COMMENT ON VIEW "public"."album_photos_active" IS 'Active album photos with dimensions from photos table (not duplicated columns)';



CREATE TABLE IF NOT EXISTS "public"."album_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "album_id" "uuid" NOT NULL,
    "tag" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."album_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."album_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "album_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."album_views" OWNER TO "supabase_admin";


COMMENT ON TABLE "public"."album_views" IS 'Tracks individual album views with timestamps for weekly trending queries';



CREATE TABLE IF NOT EXISTS "public"."albums" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
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
    "view_count" integer DEFAULT 0 NOT NULL,
    "search_vector" "tsvector" GENERATED ALWAYS AS (("setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("title", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("description", ''::"text")), 'B'::"char"))) STORED,
    "is_shared" boolean DEFAULT false NOT NULL,
    "join_policy" "text",
    "event_id" integer,
    "created_by_system" boolean DEFAULT false NOT NULL,
    "max_photos_per_user" integer,
    CONSTRAINT "albums_event_shared_chk" CHECK ((("event_id" IS NULL) OR (("is_shared" = true) AND ("created_by_system" = true)))),
    CONSTRAINT "albums_join_policy_check" CHECK (("join_policy" = ANY (ARRAY['open'::"text", 'closed'::"text"]))),
    CONSTRAINT "albums_max_photos_per_user_check" CHECK ((("max_photos_per_user" IS NULL) OR ("max_photos_per_user" > 0)))
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
    CONSTRAINT "auth_tokens_token_type_check" CHECK (("token_type" = ANY (ARRAY['email_confirmation'::"text", 'password_reset'::"text", 'email_change'::"text", 'signup_bypass'::"text"])))
);


ALTER TABLE "public"."auth_tokens" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."challenge_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "announced_by" "uuid" NOT NULL,
    "recipient_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."challenge_announcements" OWNER TO "supabase_admin";


COMMENT ON TABLE "public"."challenge_announcements" IS 'Track challenge announcement history';



CREATE TABLE IF NOT EXISTS "public"."challenge_color_draws" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "guest_nickname" "text",
    "color" "text" NOT NULL,
    "swapped_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "challenge_color_draws_user_or_guest_check" CHECK (((("user_id" IS NOT NULL) AND ("guest_nickname" IS NULL)) OR (("user_id" IS NULL) AND ("guest_nickname" IS NOT NULL) AND (TRIM(BOTH FROM "guest_nickname") <> ''::"text"))))
);


ALTER TABLE "public"."challenge_color_draws" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."challenge_comments" (
    "challenge_id" "uuid" NOT NULL,
    "comment_id" "uuid" NOT NULL
);


ALTER TABLE "public"."challenge_comments" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."challenge_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "photo_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "rejection_reason" "text",
    CONSTRAINT "challenge_submissions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."challenge_submissions" OWNER TO "supabase_admin";


COMMENT ON TABLE "public"."challenge_submissions" IS 'Photo submissions to challenges with approval workflow';



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
    "search_vector" "tsvector" GENERATED ALWAYS AS ((("setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("full_name", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("nickname", ''::"text")), 'A'::"char")) || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("bio", ''::"text")), 'B'::"char"))) STORED,
    "default_license" "public"."license_type" DEFAULT 'all-rights-reserved'::"public"."license_type" NOT NULL,
    "copyright_name" "text",
    "watermark_enabled" boolean DEFAULT false NOT NULL,
    "watermark_style" "text" DEFAULT 'text'::"text",
    "embed_copyright_exif" boolean DEFAULT false NOT NULL,
    "watermark_text" "text",
    "exif_copyright_text" "text",
    CONSTRAINT "album_card_style_check" CHECK ((("album_card_style" IS NULL) OR ("album_card_style" = ANY (ARRAY['large'::"text", 'compact'::"text"])))),
    CONSTRAINT "check_social_links_max_3" CHECK (("jsonb_array_length"(COALESCE("social_links", '[]'::"jsonb")) <= 3)),
    CONSTRAINT "profiles_nickname_format" CHECK ((("nickname" IS NULL) OR ("nickname" ~ '^[a-z0-9-]+$'::"text"))),
    CONSTRAINT "profiles_nickname_length" CHECK ((("nickname" IS NULL) OR (("length"("nickname") >= 3) AND ("length"("nickname") <= 30)))),
    CONSTRAINT "profiles_watermark_style_check" CHECK (("watermark_style" = ANY (ARRAY['text'::"text", 'diagonal'::"text"]))),
    CONSTRAINT "theme_check" CHECK ((("theme" IS NULL) OR ("theme" = ANY (ARRAY['light'::"text", 'dark'::"text", 'midnight'::"text", 'system'::"text"]))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."social_links" IS 'Array of social links (max 3). Format: [{ "label": string, "url": string }]';



COMMENT ON COLUMN "public"."profiles"."terms_accepted_at" IS 'Timestamp when the user accepted the Terms of Service during onboarding';



CREATE OR REPLACE VIEW "public"."challenge_photos" WITH ("security_invoker"='on') AS
 SELECT "cs"."challenge_id",
    "cs"."photo_id",
    "cs"."user_id",
    "cs"."submitted_at",
    "cs"."reviewed_at",
    "p"."url",
    "p"."width",
    "p"."height",
    "p"."title",
    "p"."blurhash",
    "p"."short_id",
    "pr"."nickname" AS "profile_nickname",
    "pr"."full_name" AS "profile_full_name",
    "pr"."avatar_url" AS "profile_avatar_url"
   FROM (("public"."challenge_submissions" "cs"
     JOIN "public"."photos" "p" ON (("p"."id" = "cs"."photo_id")))
     JOIN "public"."profiles" "pr" ON (("pr"."id" = "cs"."user_id")))
  WHERE (("cs"."status" = 'accepted'::"text") AND ("p"."deleted_at" IS NULL));


ALTER VIEW "public"."challenge_photos" OWNER TO "supabase_admin";


COMMENT ON VIEW "public"."challenge_photos" IS 'Accepted challenge photos with profile data for attribution';



CREATE TABLE IF NOT EXISTS "public"."challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "prompt" "text" NOT NULL,
    "cover_image_url" "text",
    "image_blurhash" "text",
    "image_width" integer,
    "image_height" integer,
    "starts_at" timestamp with time zone DEFAULT "now"(),
    "ends_at" timestamp with time zone,
    "announced_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "max_photos_per_user" integer,
    "has_color_draw" boolean DEFAULT false NOT NULL,
    "color_draw_guest_key" "text"
);


ALTER TABLE "public"."challenges" OWNER TO "supabase_admin";


COMMENT ON TABLE "public"."challenges" IS 'Photo challenges with themed prompts for member submissions';



COMMENT ON COLUMN "public"."challenges"."max_photos_per_user" IS 'Maximum number of photos a user can submit (NULL = unlimited)';



CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "parent_comment_id" "uuid"
);


ALTER TABLE "public"."comments" OWNER TO "supabase_admin";


COMMENT ON COLUMN "public"."comments"."parent_comment_id" IS 'Self-referencing foreign key for comment replies. Only single-level threading is supported - replies attach to the original parent comment.';



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
    "image_blurhash" "text",
    "image_width" integer,
    "image_height" integer,
    "max_attendees" integer,
    "slug" "text" NOT NULL,
    "rsvp_reminder_sent_at" timestamp with time zone,
    "attendee_reminder_sent_at" timestamp with time zone,
    "search_vector" "tsvector" GENERATED ALWAYS AS ((("setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("title", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("description", ''::"text")), 'B'::"char")) || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("location", ''::"text")), 'B'::"char"))) STORED
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


CREATE TABLE IF NOT EXISTS "public"."photo_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "photo_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."photo_views" OWNER TO "supabase_admin";


COMMENT ON TABLE "public"."photo_views" IS 'Tracks individual photo views with timestamps for weekly trending queries';



CREATE TABLE IF NOT EXISTS "public"."profile_interests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "interest" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profile_interests" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid",
    "reporter_email" "text",
    "reporter_name" "text",
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "details" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reports_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['photo'::"text", 'album'::"text", 'profile'::"text", 'comment'::"text"]))),
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'resolved'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "supabase_admin";


COMMENT ON TABLE "public"."reports" IS 'User-submitted reports for content moderation';



CREATE TABLE IF NOT EXISTS "public"."shared_album_members" (
    "id" bigint NOT NULL,
    "album_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shared_album_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."shared_album_members" OWNER TO "supabase_admin";


COMMENT ON TABLE "public"."shared_album_members" IS 'Active members of shared albums';



CREATE SEQUENCE IF NOT EXISTS "public"."shared_album_members_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."shared_album_members_id_seq" OWNER TO "supabase_admin";


ALTER SEQUENCE "public"."shared_album_members_id_seq" OWNED BY "public"."shared_album_members"."id";



CREATE TABLE IF NOT EXISTS "public"."shared_album_requests" (
    "id" bigint NOT NULL,
    "album_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "initiated_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    CONSTRAINT "shared_album_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text"]))),
    CONSTRAINT "shared_album_requests_type_check" CHECK (("type" = ANY (ARRAY['invite'::"text", 'request'::"text"])))
);


ALTER TABLE "public"."shared_album_requests" OWNER TO "supabase_admin";


COMMENT ON TABLE "public"."shared_album_requests" IS 'Unified invites and join requests for closed shared albums';



CREATE SEQUENCE IF NOT EXISTS "public"."shared_album_requests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."shared_album_requests_id_seq" OWNER TO "supabase_admin";


ALTER SEQUENCE "public"."shared_album_requests_id_seq" OWNED BY "public"."shared_album_requests"."id";



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



ALTER TABLE ONLY "public"."shared_album_members" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."shared_album_members_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."shared_album_requests" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."shared_album_requests_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."album_comments"
    ADD CONSTRAINT "album_comments_pkey1" PRIMARY KEY ("album_id", "comment_id");



ALTER TABLE ONLY "public"."album_likes"
    ADD CONSTRAINT "album_likes_pkey" PRIMARY KEY ("album_id", "user_id");



ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_album_photo_unique" UNIQUE ("album_id", "photo_id");



ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."album_tags"
    ADD CONSTRAINT "album_tags_album_id_tag_key" UNIQUE ("album_id", "tag");



ALTER TABLE ONLY "public"."album_tags"
    ADD CONSTRAINT "album_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."album_views"
    ADD CONSTRAINT "album_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."albums"
    ADD CONSTRAINT "albums_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_tokens"
    ADD CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenge_announcements"
    ADD CONSTRAINT "challenge_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenge_color_draws"
    ADD CONSTRAINT "challenge_color_draws_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenge_comments"
    ADD CONSTRAINT "challenge_comments_pkey" PRIMARY KEY ("challenge_id", "comment_id");



ALTER TABLE ONLY "public"."challenge_submissions"
    ADD CONSTRAINT "challenge_submissions_challenge_photo_key" UNIQUE ("challenge_id", "photo_id");



ALTER TABLE ONLY "public"."challenge_submissions"
    ADD CONSTRAINT "challenge_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_slug_key" UNIQUE ("slug");



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



ALTER TABLE ONLY "public"."photo_views"
    ADD CONSTRAINT "photo_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_interests"
    ADD CONSTRAINT "profile_interests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_interests"
    ADD CONSTRAINT "profile_interests_profile_id_interest_key" UNIQUE ("profile_id", "interest");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_nickname_key" UNIQUE ("nickname");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_album_members"
    ADD CONSTRAINT "shared_album_members_album_id_user_id_key" UNIQUE ("album_id", "user_id");



ALTER TABLE ONLY "public"."shared_album_members"
    ADD CONSTRAINT "shared_album_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_album_requests"
    ADD CONSTRAINT "shared_album_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



CREATE INDEX "albums_created_at_idx" ON "public"."albums" USING "btree" ("created_at");



CREATE UNIQUE INDEX "albums_system_slug_key" ON "public"."albums" USING "btree" ("slug") WHERE (("deleted_at" IS NULL) AND ("user_id" IS NULL));



CREATE UNIQUE INDEX "albums_user_id_slug_key" ON "public"."albums" USING "btree" ("user_id", "slug") WHERE (("deleted_at" IS NULL) AND ("user_id" IS NOT NULL));



CREATE UNIQUE INDEX "challenge_color_draws_challenge_guest_unique" ON "public"."challenge_color_draws" USING "btree" ("challenge_id", "guest_nickname") WHERE ("guest_nickname" IS NOT NULL);



CREATE INDEX "challenge_color_draws_challenge_id_idx" ON "public"."challenge_color_draws" USING "btree" ("challenge_id");



CREATE UNIQUE INDEX "challenge_color_draws_challenge_user_unique" ON "public"."challenge_color_draws" USING "btree" ("challenge_id", "user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "comments_parent_comment_id_idx" ON "public"."comments" USING "btree" ("parent_comment_id") WHERE ("parent_comment_id" IS NOT NULL);



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



CREATE INDEX "idx_album_photos_added_by" ON "public"."album_photos" USING "btree" ("added_by");



CREATE INDEX "idx_album_photos_album_id" ON "public"."album_photos" USING "btree" ("album_id");



CREATE INDEX "idx_album_photos_photo_id" ON "public"."album_photos" USING "btree" ("photo_id");



CREATE INDEX "idx_album_photos_sort_order" ON "public"."album_photos" USING "btree" ("album_id", "sort_order");



CREATE INDEX "idx_album_tags_album_id" ON "public"."album_tags" USING "btree" ("album_id");



CREATE INDEX "idx_album_tags_tag" ON "public"."album_tags" USING "btree" ("tag");



CREATE INDEX "idx_album_views_album_viewed_at" ON "public"."album_views" USING "btree" ("album_id", "viewed_at" DESC);



CREATE INDEX "idx_album_views_viewed_at" ON "public"."album_views" USING "btree" ("viewed_at" DESC);



CREATE INDEX "idx_albums_deleted_at" ON "public"."albums" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_albums_is_public" ON "public"."albums" USING "btree" ("is_public");



CREATE INDEX "idx_albums_is_suspended" ON "public"."albums" USING "btree" ("is_suspended") WHERE ("is_suspended" = true);



CREATE INDEX "idx_albums_likes_count" ON "public"."albums" USING "btree" ("likes_count" DESC);



CREATE INDEX "idx_albums_public_created_deleted" ON "public"."albums" USING "btree" ("is_public", "created_at" DESC, "deleted_at") WHERE (("is_public" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_albums_search" ON "public"."albums" USING "gin" ("search_vector");



CREATE INDEX "idx_albums_slug" ON "public"."albums" USING "btree" ("slug");



CREATE INDEX "idx_albums_user_id" ON "public"."albums" USING "btree" ("user_id");



CREATE INDEX "idx_albums_user_public_deleted" ON "public"."albums" USING "btree" ("user_id", "is_public", "deleted_at", "created_at" DESC) WHERE (("is_public" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_albums_view_count" ON "public"."albums" USING "btree" ("view_count" DESC);



CREATE INDEX "idx_auth_tokens_email_type" ON "public"."auth_tokens" USING "btree" ("email", "token_type");



CREATE INDEX "idx_auth_tokens_expires" ON "public"."auth_tokens" USING "btree" ("expires_at") WHERE ("used_at" IS NULL);



CREATE INDEX "idx_challenge_announcements_challenge" ON "public"."challenge_announcements" USING "btree" ("challenge_id");



CREATE INDEX "idx_challenge_submissions_challenge_status" ON "public"."challenge_submissions" USING "btree" ("challenge_id", "status");



CREATE INDEX "idx_challenge_submissions_user" ON "public"."challenge_submissions" USING "btree" ("user_id");



CREATE INDEX "idx_challenges_active" ON "public"."challenges" USING "btree" ("is_active", "starts_at");



CREATE INDEX "idx_challenges_slug" ON "public"."challenges" USING "btree" ("slug");



CREATE INDEX "idx_comments_created" ON "public"."comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_comments_deleted_at" ON "public"."comments" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_comments_user" ON "public"."comments" USING "btree" ("user_id");



CREATE INDEX "idx_email_preferences_email_type_id" ON "public"."email_preferences" USING "btree" ("email_type_id");



CREATE INDEX "idx_email_preferences_opted_out" ON "public"."email_preferences" USING "btree" ("opted_out") WHERE ("opted_out" = true);



CREATE INDEX "idx_email_preferences_user_id" ON "public"."email_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_event_announcements_announced_by" ON "public"."event_announcements" USING "btree" ("announced_by");



CREATE INDEX "idx_event_announcements_event_id" ON "public"."event_announcements" USING "btree" ("event_id");



CREATE INDEX "idx_events_rsvps_user_confirmed" ON "public"."events_rsvps" USING "btree" ("user_id", "confirmed_at") WHERE (("confirmed_at" IS NOT NULL) AND ("canceled_at" IS NULL));



CREATE INDEX "idx_events_search" ON "public"."events" USING "gin" ("search_vector");



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



CREATE INDEX "idx_photo_views_photo_viewed_at" ON "public"."photo_views" USING "btree" ("photo_id", "viewed_at" DESC);



CREATE INDEX "idx_photo_views_viewed_at" ON "public"."photo_views" USING "btree" ("viewed_at" DESC);



CREATE INDEX "idx_photos_deleted_at" ON "public"."photos" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_photos_id_deleted_at" ON "public"."photos" USING "btree" ("id", "deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_photos_likes_count" ON "public"."photos" USING "btree" ("likes_count" DESC);



CREATE INDEX "idx_photos_original_filename" ON "public"."photos" USING "btree" ("original_filename") WHERE ("original_filename" IS NOT NULL);



CREATE INDEX "idx_photos_search" ON "public"."photos" USING "gin" ("search_vector");



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



CREATE INDEX "idx_profiles_search" ON "public"."profiles" USING "gin" ("search_vector");



CREATE INDEX "idx_profiles_suspended_at" ON "public"."profiles" USING "btree" ("suspended_at") WHERE ("suspended_at" IS NOT NULL);



CREATE INDEX "idx_reports_entity" ON "public"."reports" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_reports_reporter_email" ON "public"."reports" USING "btree" ("reporter_email");



CREATE INDEX "idx_reports_reporter_id" ON "public"."reports" USING "btree" ("reporter_id");



CREATE INDEX "idx_reports_status" ON "public"."reports" USING "btree" ("status");



CREATE INDEX "idx_shared_album_members_album" ON "public"."shared_album_members" USING "btree" ("album_id");



CREATE INDEX "idx_shared_album_members_user" ON "public"."shared_album_members" USING "btree" ("user_id");



CREATE INDEX "idx_shared_album_requests_album_status" ON "public"."shared_album_requests" USING "btree" ("album_id", "status");



CREATE INDEX "idx_shared_album_requests_user_status" ON "public"."shared_album_requests" USING "btree" ("user_id", "status");



CREATE INDEX "idx_tags_count" ON "public"."tags" USING "btree" ("count" DESC);



CREATE INDEX "idx_tags_name" ON "public"."tags" USING "btree" ("name");



CREATE INDEX "idx_tags_name_prefix" ON "public"."tags" USING "btree" ("name" "text_pattern_ops");



CREATE INDEX "profiles_email_idx" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "profiles_nickname_idx" ON "public"."profiles" USING "btree" ("nickname");



CREATE UNIQUE INDEX "uq_shared_album_requests_pending" ON "public"."shared_album_requests" USING "btree" ("album_id", "user_id") WHERE ("status" = 'pending'::"text");



CREATE OR REPLACE TRIGGER "photo_sort_order_trigger" BEFORE INSERT ON "public"."photos" FOR EACH ROW EXECUTE FUNCTION "public"."set_photo_sort_order"();



CREATE OR REPLACE TRIGGER "prevent_private_challenge_photo_trigger" BEFORE UPDATE ON "public"."photos" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_private_challenge_photo"();



CREATE OR REPLACE TRIGGER "trigger_after_event_insert" AFTER INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_create_event_album"();



CREATE OR REPLACE TRIGGER "trigger_after_shared_album_insert" AFTER INSERT ON "public"."albums" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_add_shared_album_owner"();



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
    ADD CONSTRAINT "album_photos_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_tags"
    ADD CONSTRAINT "album_tags_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_views"
    ADD CONSTRAINT "album_views_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."albums"
    ADD CONSTRAINT "albums_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."albums"
    ADD CONSTRAINT "albums_suspended_by_fkey" FOREIGN KEY ("suspended_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."albums"
    ADD CONSTRAINT "albums_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auth_tokens"
    ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_announcements"
    ADD CONSTRAINT "challenge_announcements_announced_by_fkey" FOREIGN KEY ("announced_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."challenge_announcements"
    ADD CONSTRAINT "challenge_announcements_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_color_draws"
    ADD CONSTRAINT "challenge_color_draws_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_color_draws"
    ADD CONSTRAINT "challenge_color_draws_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_comments"
    ADD CONSTRAINT "challenge_comments_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_comments"
    ADD CONSTRAINT "challenge_comments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_submissions"
    ADD CONSTRAINT "challenge_submissions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_submissions"
    ADD CONSTRAINT "challenge_submissions_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_submissions"
    ADD CONSTRAINT "challenge_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."challenge_submissions"
    ADD CONSTRAINT "challenge_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



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
    ADD CONSTRAINT "events_rsvps_user_id_profiles_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."photo_views"
    ADD CONSTRAINT "photo_views_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_interests"
    ADD CONSTRAINT "profile_interests_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shared_album_members"
    ADD CONSTRAINT "shared_album_members_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_album_members"
    ADD CONSTRAINT "shared_album_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_album_requests"
    ADD CONSTRAINT "shared_album_requests_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_album_requests"
    ADD CONSTRAINT "shared_album_requests_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_album_requests"
    ADD CONSTRAINT "shared_album_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can create announcements" ON "public"."challenge_announcements" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can create challenges" ON "public"."challenges" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can create event announcements" ON "public"."event_announcements" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can delete challenges" ON "public"."challenges" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can review submissions" ON "public"."challenge_submissions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can update challenges" ON "public"."challenges" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can update reports" ON "public"."reports" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can view all event announcements" ON "public"."event_announcements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can view announcements" ON "public"."challenge_announcements" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Album likes are publicly readable" ON "public"."album_likes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."albums"
  WHERE (("albums"."id" = "album_likes"."album_id") AND (("albums"."is_public" = true) OR ("albums"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) AND ("albums"."deleted_at" IS NULL)))));



CREATE POLICY "Album views are publicly readable" ON "public"."album_views" FOR SELECT USING (true);



CREATE POLICY "Anon can create guest color draw" ON "public"."challenge_color_draws" FOR INSERT TO "anon" WITH CHECK ((("user_id" IS NULL) AND ("guest_nickname" IS NOT NULL) AND (TRIM(BOTH FROM "guest_nickname") <> ''::"text")));



CREATE POLICY "Anon can update guest color draw" ON "public"."challenge_color_draws" FOR UPDATE TO "anon" USING (("user_id" IS NULL)) WITH CHECK (("user_id" IS NULL));



CREATE POLICY "Anon can view accepted submissions" ON "public"."challenge_submissions" FOR SELECT TO "anon" USING (("status" = 'accepted'::"text"));



CREATE POLICY "Anon can view active challenges" ON "public"."challenges" FOR SELECT TO "anon" USING (("is_active" = true));



CREATE POLICY "Anyone can create RSVPs" ON "public"."events_rsvps" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can track album views" ON "public"."album_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can track photo views" ON "public"."photo_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can view challenge color draws" ON "public"."challenge_color_draws" FOR SELECT USING (true);



CREATE POLICY "Authenticated select challenges" ON "public"."challenges" FOR SELECT TO "authenticated" USING ((("is_active" = true) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Authenticated select submissions" ON "public"."challenge_submissions" FOR SELECT TO "authenticated" USING ((("status" = 'accepted'::"text") OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Authenticated users can add challenge comments" ON "public"."challenge_comments" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can add event comments" ON "public"."event_comments" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can create own color draw" ON "public"."challenge_color_draws" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("guest_nickname" IS NULL)));



CREATE POLICY "Authenticated users can insert interests" ON "public"."interests" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can insert tags" ON "public"."tags" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can like albums" ON "public"."album_likes" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can like photos" ON "public"."photo_likes" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can swap own color draw" ON "public"."challenge_color_draws" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Authenticated users can update interests" ON "public"."interests" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can update tags" ON "public"."tags" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Challenge comments are viewable by everyone" ON "public"."challenge_comments" FOR SELECT TO "authenticated", "anon" USING (true);



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



CREATE POLICY "No direct member deletes" ON "public"."shared_album_members" FOR DELETE USING (false);



CREATE POLICY "No direct member inserts" ON "public"."shared_album_members" FOR INSERT WITH CHECK (false);



CREATE POLICY "No direct member updates" ON "public"."shared_album_members" FOR UPDATE USING (false);



CREATE POLICY "No direct request deletes" ON "public"."shared_album_requests" FOR DELETE USING (false);



CREATE POLICY "No direct request inserts" ON "public"."shared_album_requests" FOR INSERT WITH CHECK (false);



CREATE POLICY "No direct request updates" ON "public"."shared_album_requests" FOR UPDATE USING (false);



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



CREATE POLICY "Photo views are publicly readable" ON "public"."photo_views" FOR SELECT USING (true);



CREATE POLICY "Profile interests are viewable by everyone" ON "public"."profile_interests" FOR SELECT USING (true);



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Read own or managed members" ON "public"."shared_album_members" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."albums" "a"
  WHERE (("a"."id" = "shared_album_members"."album_id") AND (("a"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR COALESCE(( SELECT "profiles"."is_admin"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = ( SELECT "auth"."uid"() AS "uid"))), false)))))));



CREATE POLICY "Read own requests or owner-managed requests" ON "public"."shared_album_requests" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("initiated_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."albums" "a"
  WHERE (("a"."id" = "shared_album_requests"."album_id") AND (("a"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR COALESCE(( SELECT "profiles"."is_admin"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = ( SELECT "auth"."uid"() AS "uid"))), false)))))));



CREATE POLICY "Select RSVPs policy" ON "public"."events_rsvps" FOR SELECT USING (((("confirmed_at" IS NOT NULL) AND ("canceled_at" IS NULL)) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Select album photos policy" ON "public"."album_photos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."albums"
  WHERE (("albums"."id" = "album_photos"."album_id") AND (("albums"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("albums"."is_public" = true) AND (("albums"."is_suspended" IS NULL) OR ("albums"."is_suspended" = false))) OR "public"."is_shared_album_member"("albums"."id", ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))))))));



CREATE POLICY "Select album tags policy" ON "public"."album_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."albums"
  WHERE (("albums"."id" = "album_tags"."album_id") AND (("albums"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("albums"."is_public" = true) AND (("albums"."is_suspended" IS NULL) OR ("albums"."is_suspended" = false))) OR "public"."is_shared_album_member"("albums"."id", ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))))))));



CREATE POLICY "Select albums policy" ON "public"."albums" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("is_public" = true) AND (("is_suspended" IS NULL) OR ("is_suspended" = false))) OR "public"."is_shared_album_member"("id", ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
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



CREATE POLICY "Users can create reports" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "reporter_id") AND ("reporter_email" IS NULL) AND ("reporter_name" IS NULL)));



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



CREATE POLICY "Users can submit to active challenges" ON "public"."challenge_submissions" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."challenges"
  WHERE (("challenges"."id" = "challenge_submissions"."challenge_id") AND ("challenges"."is_active" = true) AND (("challenges"."ends_at" IS NULL) OR ("challenges"."ends_at" > "now"())))))));



CREATE POLICY "Users can unlike their own album likes" ON "public"."album_likes" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can unlike their own photo likes" ON "public"."photo_likes" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own comments" ON "public"."comments" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own photos" ON "public"."photos" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update photos in their own albums" ON "public"."album_photos" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."albums"
  WHERE (("albums"."id" = "album_photos"."album_id") AND ("albums"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Users can view own reports or admins view all" ON "public"."reports" FOR SELECT TO "authenticated" USING ((("reporter_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Users can view tags from public photos or their own photos" ON "public"."photo_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."photos"
  WHERE (("photos"."id" = "photo_tags"."photo_id") AND ((("photos"."is_public" = true) AND ("photos"."deleted_at" IS NULL)) OR ("photos"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users or admins can delete challenge comments" ON "public"."challenge_comments" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."comments"
  WHERE (("comments"."id" = "challenge_comments"."comment_id") AND ("comments"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



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



CREATE POLICY "Withdraw pending or admin delete" ON "public"."challenge_submissions" FOR DELETE TO "authenticated" USING (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'pending'::"text")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



ALTER TABLE "public"."album_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."album_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."album_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."album_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."album_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."albums" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenge_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenge_color_draws" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenge_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenge_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;


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


ALTER TABLE "public"."photo_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_interests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shared_album_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shared_album_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";















































































































































































































GRANT ALL ON FUNCTION "public"."add_challenge_comment"("p_challenge_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."add_challenge_comment"("p_challenge_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."add_challenge_comment"("p_challenge_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_challenge_comment"("p_challenge_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text", "p_parent_comment_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text", "p_parent_comment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text", "p_parent_comment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text", "p_parent_comment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_photos_to_shared_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."add_photos_to_shared_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."add_photos_to_shared_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_photos_to_shared_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_shared_album_owner"("p_album_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."add_shared_album_owner"("p_album_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."add_shared_album_owner"("p_album_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_shared_album_owner"("p_album_id" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."bulk_review_challenge_submissions"("p_submission_ids" "uuid"[], "p_status" "text", "p_rejection_reason" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."bulk_review_challenge_submissions"("p_submission_ids" "uuid"[], "p_status" "text", "p_rejection_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_review_challenge_submissions"("p_submission_ids" "uuid"[], "p_status" "text", "p_rejection_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_review_challenge_submissions"("p_submission_ids" "uuid"[], "p_status" "text", "p_rejection_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_auth_tokens"() TO "postgres";
GRANT ALL ON FUNCTION "public"."cleanup_expired_auth_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_auth_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_auth_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_event_album"("p_event_id" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."create_event_album"("p_event_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_event_album"("p_event_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_event_album"("p_event_id" integer) TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_profile_stats"("p_user_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."get_profile_stats"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_profile_stats"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_profile_stats"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_album_photos_count"("user_uuid" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."get_user_album_photos_count"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_album_photos_count"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_album_photos_count"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_stats"("p_user_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."get_user_stats"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_stats"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_stats"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."global_search"("search_query" "text", "result_limit" integer, "search_types" "text"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."global_search"("search_query" "text", "result_limit" integer, "search_types" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."global_search"("search_query" "text", "result_limit" integer, "search_types" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."global_search"("search_query" "text", "result_limit" integer, "search_types" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "postgres";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_view_count"("p_entity_type" "text", "p_entity_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."increment_view_count"("p_entity_type" "text", "p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_view_count"("p_entity_type" "text", "p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_view_count"("p_entity_type" "text", "p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."invite_to_shared_album"("p_album_id" "uuid", "p_user_ids" "uuid"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."invite_to_shared_album"("p_album_id" "uuid", "p_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."invite_to_shared_album"("p_album_id" "uuid", "p_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."invite_to_shared_album"("p_album_id" "uuid", "p_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_shared_album_member"("p_album_id" "uuid", "p_user_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."is_shared_album_member"("p_album_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_shared_album_member"("p_album_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_shared_album_member"("p_album_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."join_shared_album"("p_album_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."join_shared_album"("p_album_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."join_shared_album"("p_album_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_shared_album"("p_album_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."leave_shared_album"("p_album_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."leave_shared_album"("p_album_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."leave_shared_album"("p_album_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."leave_shared_album"("p_album_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_private_challenge_photo"() TO "postgres";
GRANT ALL ON FUNCTION "public"."prevent_private_challenge_photo"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_private_challenge_photo"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_private_challenge_photo"() TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_album_member"("p_album_id" "uuid", "p_user_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."remove_album_member"("p_album_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_album_member"("p_album_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_album_member"("p_album_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_shared_album_photo"("p_album_id" "uuid", "p_album_photo_ids" "uuid"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."remove_shared_album_photo"("p_album_id" "uuid", "p_album_photo_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."remove_shared_album_photo"("p_album_id" "uuid", "p_album_photo_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_shared_album_photo"("p_album_id" "uuid", "p_album_photo_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_album_request"("p_request_id" bigint, "p_action" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."resolve_album_request"("p_request_id" bigint, "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_album_request"("p_request_id" bigint, "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_album_request"("p_request_id" bigint, "p_action" "text") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."review_challenge_submission"("p_submission_id" "uuid", "p_status" "text", "p_rejection_reason" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."review_challenge_submission"("p_submission_id" "uuid", "p_status" "text", "p_rejection_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."review_challenge_submission"("p_submission_id" "uuid", "p_status" "text", "p_rejection_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."review_challenge_submission"("p_submission_id" "uuid", "p_status" "text", "p_rejection_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_photo_sort_order"() TO "postgres";
GRANT ALL ON FUNCTION "public"."set_photo_sort_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_photo_sort_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_photo_sort_order"() TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_to_challenge"("p_challenge_id" "uuid", "p_photo_ids" "uuid"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."submit_to_challenge"("p_challenge_id" "uuid", "p_photo_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_to_challenge"("p_challenge_id" "uuid", "p_photo_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_to_challenge"("p_challenge_id" "uuid", "p_photo_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_add_shared_album_owner"() TO "postgres";
GRANT ALL ON FUNCTION "public"."trigger_add_shared_album_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_add_shared_album_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_add_shared_album_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_create_event_album"() TO "postgres";
GRANT ALL ON FUNCTION "public"."trigger_create_event_album"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_create_event_album"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_create_event_album"() TO "service_role";



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



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_views" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_views" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_views" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."album_views" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."albums" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."albums" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."albums" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."auth_tokens" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."auth_tokens" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."auth_tokens" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."auth_tokens" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_announcements" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_announcements" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_announcements" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_announcements" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_color_draws" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_color_draws" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_color_draws" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_color_draws" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_comments" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_comments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_comments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_comments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_submissions" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_submissions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_submissions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_submissions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_photos" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_photos" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_photos" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenge_photos" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenges" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenges" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenges" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."challenges" TO "service_role";



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



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_views" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_views" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_views" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."photo_views" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profile_interests" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profile_interests" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profile_interests" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profile_interests" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reports" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reports" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reports" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reports" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shared_album_members" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shared_album_members" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shared_album_members" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shared_album_members" TO "service_role";



GRANT ALL ON SEQUENCE "public"."shared_album_members_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."shared_album_members_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."shared_album_members_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."shared_album_members_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shared_album_requests" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shared_album_requests" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shared_album_requests" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shared_album_requests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."shared_album_requests_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."shared_album_requests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."shared_album_requests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."shared_album_requests_id_seq" TO "service_role";



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































