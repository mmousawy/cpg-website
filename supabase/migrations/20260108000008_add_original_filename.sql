-- Add original_filename column to photos table
-- This stores the original name of the file when uploaded

ALTER TABLE public.photos 
  ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- Create index for potential future search by filename
CREATE INDEX IF NOT EXISTS idx_photos_original_filename 
  ON public.photos(original_filename) 
  WHERE original_filename IS NOT NULL;

