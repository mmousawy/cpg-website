-- Create storage bucket for event cover images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-covers',
  'event-covers',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket policies for event-covers bucket

-- Allow admin users to upload event covers
CREATE POLICY "Admins can upload event covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-covers' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Allow admin users to update event covers
CREATE POLICY "Admins can update event covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-covers' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Allow admin users to delete event covers
CREATE POLICY "Admins can delete event covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-covers' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Allow public access to read all event cover images
CREATE POLICY "Event covers are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-covers');
