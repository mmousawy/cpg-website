-- Add likes_count columns to photos and albums tables
-- This denormalization allows fast count reads without JOINs/COUNTs

-- Add columns (default to 0)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

-- Create indexes for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_photos_likes_count ON photos(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_albums_likes_count ON albums(likes_count DESC);

-- Function to update photo likes count
CREATE OR REPLACE FUNCTION update_photo_likes_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update album likes count
CREATE OR REPLACE FUNCTION update_album_likes_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_photo_likes_count ON photo_likes;
CREATE TRIGGER trigger_update_photo_likes_count
  AFTER INSERT OR DELETE ON photo_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_likes_count();

DROP TRIGGER IF EXISTS trigger_update_album_likes_count ON album_likes;
CREATE TRIGGER trigger_update_album_likes_count
  AFTER INSERT OR DELETE ON album_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_album_likes_count();

-- Backfill existing counts
UPDATE photos p
SET likes_count = (
  SELECT COUNT(*) FROM photo_likes pl WHERE pl.photo_id = p.id
);

UPDATE albums a
SET likes_count = (
  SELECT COUNT(*) FROM album_likes al WHERE al.album_id = a.id
);
