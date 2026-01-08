-- Function to batch update photos (all editable fields)
-- Each item in photo_updates should have 'id' and any fields to update:
-- { id, title?, description?, is_public?, sort_order? }
CREATE OR REPLACE FUNCTION batch_update_photos(photo_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE photos
  SET 
    title = COALESCE(update_item->>'title', photos.title),
    description = COALESCE(update_item->>'description', photos.description),
    is_public = COALESCE((update_item->>'is_public')::boolean, photos.is_public),
    sort_order = COALESCE((update_item->>'sort_order')::int, photos.sort_order)
  FROM jsonb_array_elements(photo_updates) AS update_item
  WHERE photos.id = (update_item->>'id')::uuid
    AND photos.user_id = auth.uid();
END;
$$;

-- Function to batch update album_photos (all editable fields)
-- Each item in photo_updates should have 'id' and any fields to update:
-- { id, title?, sort_order? }
CREATE OR REPLACE FUNCTION batch_update_album_photos(photo_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  album_user_id uuid;
BEGIN
  -- Get the album's user_id from the first photo to verify ownership
  SELECT a.user_id INTO album_user_id
  FROM album_photos ap
  JOIN albums a ON a.id = ap.album_id
  WHERE ap.id = ((photo_updates->0)->>'id')::uuid
  LIMIT 1;

  -- Only proceed if the current user owns the album
  IF album_user_id = auth.uid() THEN
    UPDATE album_photos
    SET 
      title = COALESCE(update_item->>'title', album_photos.title),
      sort_order = COALESCE((update_item->>'sort_order')::int, album_photos.sort_order)
    FROM jsonb_array_elements(photo_updates) AS update_item
    WHERE album_photos.id = (update_item->>'id')::uuid;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION batch_update_photos(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_album_photos(jsonb) TO authenticated;

