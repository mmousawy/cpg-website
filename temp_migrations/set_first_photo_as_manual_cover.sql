-- Update add_photos_to_album to set first photo as manual cover if album has no cover
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

COMMENT ON FUNCTION "public"."add_photos_to_album"("p_album_id" "uuid", "p_photo_ids" "uuid"[]) IS 'Efficiently adds multiple photos to an album, handling deduplication and sort_order. Sets first photo as manual cover if album has no cover.';
