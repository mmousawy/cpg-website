-- Fix mutable search_path security issue for trigger functions
-- Setting search_path = '' prevents search_path injection attacks
-- All table references must be fully qualified with schema prefix

-- Fix auto_assign_album_photo_sort_order function
CREATE OR REPLACE FUNCTION auto_assign_album_photo_sort_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
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

COMMENT ON FUNCTION auto_assign_album_photo_sort_order() IS 
  'Auto-assigns sort_order to new album_photos based on current max + 1';

-- Fix update_album_cover function
CREATE OR REPLACE FUNCTION update_album_cover()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  target_album_id UUID;
  new_cover_url TEXT;
BEGIN
  -- Determine which album to update
  IF TG_OP = 'DELETE' THEN
    target_album_id := OLD.album_id;
  ELSE
    target_album_id := NEW.album_id;
  END IF;

  -- Get the first photo by sort_order for this album (excluding deleted photos)
  SELECT ap.photo_url INTO new_cover_url
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

  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION update_album_cover() IS 
  'Automatically updates album cover_image_url to the first non-deleted photo by sort_order whenever album_photos are added, removed, or reordered';
