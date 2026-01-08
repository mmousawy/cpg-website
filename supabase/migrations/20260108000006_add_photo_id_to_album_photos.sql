-- Add photo_id foreign key to album_photos for proper relationship with photos table

-- Step 1: Add the column (nullable initially) - only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'album_photos' 
    AND column_name = 'photo_id'
  ) THEN
    ALTER TABLE album_photos
    ADD COLUMN photo_id UUID REFERENCES photos(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 2: Populate photo_id from existing photo_url matches (safe to run multiple times)
UPDATE album_photos ap
SET photo_id = p.id
FROM photos p
WHERE ap.photo_url = p.url
  AND ap.photo_id IS NULL;

-- Step 3: Delete orphaned album_photos that don't have a matching photo
DELETE FROM album_photos WHERE photo_id IS NULL;

-- Step 4: Make the column NOT NULL (idempotent - won't fail if already NOT NULL)
DO $$
BEGIN
  ALTER TABLE album_photos ALTER COLUMN photo_id SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Step 5: Create index for efficient lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_album_photos_photo_id ON album_photos(photo_id);

-- Step 6: Add unique constraint to prevent duplicate photo in same album (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'album_photos_album_photo_unique'
  ) THEN
    ALTER TABLE album_photos
    ADD CONSTRAINT album_photos_album_photo_unique UNIQUE (album_id, photo_id);
  END IF;
END $$;

