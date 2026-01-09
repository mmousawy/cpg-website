-- Function to update album cover based on first photo by sort_order
CREATE OR REPLACE FUNCTION update_album_cover()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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

  -- Get the first photo by sort_order for this album
  SELECT photo_url INTO new_cover_url
  FROM album_photos
  WHERE album_id = target_album_id
  ORDER BY sort_order ASC NULLS LAST, created_at ASC
  LIMIT 1;

  -- Update the album's cover image
  UPDATE albums
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

-- Create trigger for INSERT, UPDATE, and DELETE on album_photos
DROP TRIGGER IF EXISTS trigger_update_album_cover ON album_photos;

CREATE TRIGGER trigger_update_album_cover
AFTER INSERT OR UPDATE OF sort_order, photo_url OR DELETE
ON album_photos
FOR EACH ROW
EXECUTE FUNCTION update_album_cover();

-- Add a comment explaining the trigger
COMMENT ON FUNCTION update_album_cover() IS 
  'Automatically updates album cover_image_url to the first photo by sort_order whenever album_photos are added, removed, or reordered';

