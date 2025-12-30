-- Storage bucket policies for user-albums bucket
-- Run these in Supabase Dashboard -> Storage -> user-albums -> Policies

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to their own albums folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-albums' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files
CREATE POLICY "Users can update their own album photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-albums' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own album photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-albums' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to read all files (since public albums need to be viewable)
CREATE POLICY "Public albums photos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-albums');
