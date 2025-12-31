-- Migration: Add foreign key from album_photos.photo_url to images.url
ALTER TABLE album_photos
ADD CONSTRAINT fk_album_photos_image_url
FOREIGN KEY (photo_url)
REFERENCES images(url)
ON DELETE SET NULL;
