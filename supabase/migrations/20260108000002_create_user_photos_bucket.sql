-- ============================================================================
-- CREATE USER PHOTOS STORAGE BUCKET
-- ============================================================================

-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-photos',
  'user-photos', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload to their own folder
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Users can delete their own photos
CREATE POLICY "Users can delete own photos"  
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Public read access
CREATE POLICY "Public read access for user photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'user-photos');

