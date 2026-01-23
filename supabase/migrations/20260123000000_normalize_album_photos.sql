-- Migration: Normalize album_photos table
-- This migration removes redundant columns and updates views/functions
-- Phase 1: Non-breaking changes (backward compatible)

-- ============================================================================
-- 1. Update album_photos_active view to get width/height from photos table
-- ============================================================================
-- The view currently selects width/height from album_photos, but these are
-- redundant copies of photos.width/height. Update to use the canonical source.

CREATE OR REPLACE VIEW "public"."album_photos_active" WITH ("security_invoker"='true') AS
SELECT 
  ap.id,
  ap.album_id,
  p.url AS photo_url,  -- Use photos.url instead of album_photos.photo_url
  ap.title,            -- Keep album-specific title override
  ap.description,      -- Keep for now (unused but harmless)
  p.width,             -- Use photos.width instead of album_photos.width
  p.height,            -- Use photos.height instead of album_photos.height
  ap.sort_order,
  ap.created_at,
  ap.photo_id
FROM public.album_photos ap
JOIN public.photos p ON p.id = ap.photo_id
WHERE p.deleted_at IS NULL;

COMMENT ON VIEW "public"."album_photos_active" IS 'Active album photos with dimensions from photos table (not duplicated columns)';

-- ============================================================================
-- 2. Fix sort_order DEFAULT 0 conflict with auto-assign trigger
-- ============================================================================
-- The trigger auto_assign_album_photo_sort_order assigns sort_order if NULL,
-- but DEFAULT 0 means it's never NULL. Remove the default so trigger works.

ALTER TABLE "public"."album_photos" ALTER COLUMN "sort_order" DROP DEFAULT;

-- ============================================================================
-- 3. Update add_photos_to_album function to not write redundant columns
-- ============================================================================
-- The function currently writes photo_url, width, height which are redundant.
-- We still write photo_url for now (used by cover logic) but stop writing w/h.

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

COMMENT ON FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) IS 'Adds photos to album. Width/height now read from photos table via view.';

-- ============================================================================
-- 4. Update update_album_cover trigger to use photos.url
-- ============================================================================
-- The trigger uses OLD.photo_url which is redundant. Update to join photos.

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

COMMENT ON FUNCTION "public"."update_album_cover"() IS 'Updates album cover when cover photo is removed. Uses photos.url (not redundant column).';

-- ============================================================================
-- 5. Drop redundant FK on photo_url
-- ============================================================================
-- The fk_album_photos_photo_url constraint is redundant since we have photo_id FK.

ALTER TABLE "public"."album_photos" DROP CONSTRAINT IF EXISTS "fk_album_photos_photo_url";

-- Also drop the redundant unique constraint on album_id + photo_url
ALTER TABLE "public"."album_photos" DROP CONSTRAINT IF EXISTS "album_photos_unique_photo";

-- ============================================================================
-- 6. Fix events_rsvps dual FK issue
-- ============================================================================
-- events_rsvps.user_id has two FKs: one to auth.users, one to profiles.
-- Since profiles.id already FKs to auth.users.id, the auth.users FK is redundant.

ALTER TABLE "public"."events_rsvps" DROP CONSTRAINT IF EXISTS "events_rsvps_user_id_fkey";
-- Keep only: events_rsvps_user_id_profiles_fkey -> profiles(id)

-- ============================================================================
-- Phase 2 will be a separate migration after code is updated to stop writing
-- redundant columns. That migration will:
-- - ALTER TABLE album_photos DROP COLUMN width;
-- - ALTER TABLE album_photos DROP COLUMN height;
-- - ALTER TABLE album_photos DROP COLUMN description;
-- - Eventually DROP COLUMN photo_url (after cover logic updated)
-- ============================================================================
