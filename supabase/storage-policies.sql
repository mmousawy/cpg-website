-- Storage bucket policies for user-photos bucket
-- Run these in Supabase Dashboard -> Storage -> user-photos -> Policies

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to their own photos folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to read all files (since public photos need to be viewable)
CREATE POLICY "Public photos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-photos');

-- Storage bucket policies for user-banners bucket
-- Run these in Supabase Dashboard -> Storage -> user-banners -> Policies

CREATE POLICY "Users can upload to their own banners folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-banners' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-banners' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-banners' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public banners are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-banners');

-- Storage bucket policies for event-covers (admin uploads go through
-- /api/admin/upload-cover with the service role; these policies are for
-- any remaining authenticated admin client access).

CREATE POLICY "Admins can upload event covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-covers' AND
  public.is_admin()
);

CREATE POLICY "Admins can update event covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-covers' AND
  public.is_admin()
)
WITH CHECK (
  bucket_id = 'event-covers' AND
  public.is_admin()
);

CREATE POLICY "Admins can delete event covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-covers' AND
  public.is_admin()
);

CREATE POLICY "Event covers are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-covers');
