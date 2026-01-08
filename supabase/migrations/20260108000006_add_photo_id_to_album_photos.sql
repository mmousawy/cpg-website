-- Add photo_id foreign key to album_photos for proper relationship with photos table

-- Step 1: Add the column (nullable initially)
ALTER TABLE album_photos
ADD COLUMN photo_id UUID REFERENCES photos(id) ON DELETE CASCADE;

-- Step 2: Populate photo_id from existing photo_url matches
UPDATE album_photos ap
SET photo_id = p.id
FROM photos p
WHERE ap.photo_url = p.url;

-- Step 3: Make the column NOT NULL (only if all rows have been populated)
-- Note: If there are orphaned album_photos without matching photos, this will fail
-- In that case, you may want to delete orphaned rows first:
-- DELETE FROM album_photos WHERE photo_id IS NULL;
ALTER TABLE album_photos
ALTER COLUMN photo_id SET NOT NULL;

-- Step 4: Create index for efficient lookups
CREATE INDEX idx_album_photos_photo_id ON album_photos(photo_id);

-- Step 5: Add unique constraint to prevent duplicate photo in same album
ALTER TABLE album_photos
ADD CONSTRAINT album_photos_album_photo_unique UNIQUE (album_id, photo_id);

