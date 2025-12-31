-- Create images metadata table
CREATE TABLE IF NOT EXISTS public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL UNIQUE,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  exif_data JSONB,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on storage_path for faster lookups
CREATE INDEX IF NOT EXISTS idx_images_storage_path ON public.images(storage_path);

-- Create index on url for lookups by URL
CREATE INDEX IF NOT EXISTS idx_images_url ON public.images(url);

-- Create index on uploaded_by for user queries
CREATE INDEX IF NOT EXISTS idx_images_uploaded_by ON public.images(uploaded_by);

-- Enable RLS
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read image metadata
CREATE POLICY "Anyone can view image metadata"
  ON public.images
  FOR SELECT
  USING (true);

-- Only admins can insert image metadata
CREATE POLICY "Only admins can insert image metadata"
  ON public.images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admins can delete image metadata
CREATE POLICY "Only admins can delete image metadata"
  ON public.images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
