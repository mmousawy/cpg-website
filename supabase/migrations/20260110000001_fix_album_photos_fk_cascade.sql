-- Fix: Change album_photos foreign key from SET NULL to CASCADE
-- The previous migration used ON DELETE SET NULL, but photo_url has NOT NULL constraint
-- This caused errors when deleting photos that are in albums

-- Drop any existing foreign key constraints (might have different names)
ALTER TABLE album_photos
DROP CONSTRAINT IF EXISTS fk_album_photos_image_url;

ALTER TABLE album_photos
DROP CONSTRAINT IF EXISTS fk_album_photos_photo_url;

-- Re-add with CASCADE instead of SET NULL
-- When a photo is deleted, the album_photo entry should also be deleted
ALTER TABLE album_photos
ADD CONSTRAINT fk_album_photos_photo_url
FOREIGN KEY (photo_url)
REFERENCES photos(url)
ON DELETE CASCADE;

COMMENT ON CONSTRAINT fk_album_photos_photo_url ON album_photos IS 
  'When a photo is deleted, automatically remove it from all albums';
