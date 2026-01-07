-- Add short_id column to photos table for cleaner URLs
-- Uses 5-character lowercase alphanumeric without vowels (~28 million combinations)

-- Add short_id column
ALTER TABLE public.photos 
  ADD COLUMN IF NOT EXISTS short_id TEXT;

-- Create unique index on short_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_short_id 
  ON public.photos(short_id) 
  WHERE short_id IS NOT NULL;

-- Generate short_ids for existing photos that don't have one
-- Using a PostgreSQL function to generate nanoid-like IDs (no vowels to avoid profanity)
CREATE OR REPLACE FUNCTION generate_short_id(size INT DEFAULT 5)
RETURNS TEXT AS $$
DECLARE
  id TEXT := '';
  i INT := 0;
  chars TEXT := 'bcdfghjklmnpqrstvwxyz0123456789';
  chars_length INT := length(chars);
BEGIN
  WHILE i < size LOOP
    id := id || substr(chars, floor(random() * chars_length + 1)::INT, 1);
    i := i + 1;
  END LOOP;
  RETURN id;
END;
$$ LANGUAGE plpgsql;

-- Update existing photos with short_ids
UPDATE public.photos
SET short_id = generate_short_id(5)
WHERE short_id IS NULL;

-- Make short_id NOT NULL after populating existing rows
ALTER TABLE public.photos
  ALTER COLUMN short_id SET NOT NULL;

-- Add default value for new photos (will be overwritten by app code, but provides fallback)
ALTER TABLE public.photos
  ALTER COLUMN short_id SET DEFAULT generate_short_id(5);

