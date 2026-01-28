-- Remove image_url column from events table
-- All event images should now be in cover_image field

ALTER TABLE events DROP COLUMN IF EXISTS image_url;
