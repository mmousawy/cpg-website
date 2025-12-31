-- Create albums table
CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Ensure profiles table has unique nickname constraint and validation
-- This should be added to the profiles table if it doesn't exist
ALTER TABLE profiles ADD CONSTRAINT profiles_nickname_unique UNIQUE (nickname);
ALTER TABLE profiles ADD CONSTRAINT profiles_nickname_not_null CHECK (nickname IS NOT NULL);
ALTER TABLE profiles ADD CONSTRAINT profiles_nickname_length CHECK (LENGTH(nickname) >= 3 AND LENGTH(nickname) <= 30);
ALTER TABLE profiles ADD CONSTRAINT profiles_nickname_format CHECK (nickname ~ '^[a-z0-9-]+$');

-- Create album_photos table
CREATE TABLE IF NOT EXISTS album_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_slug ON albums(slug);
CREATE INDEX IF NOT EXISTS idx_albums_is_public ON albums(is_public);
CREATE INDEX IF NOT EXISTS idx_album_photos_album_id ON album_photos(album_id);
CREATE INDEX IF NOT EXISTS idx_album_photos_sort_order ON album_photos(album_id, sort_order);

-- Enable Row Level Security (RLS)
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for albums table

-- Allow all users to read public albums
CREATE POLICY "Public albums are viewable by everyone"
  ON albums FOR SELECT
  USING (is_public = true);

-- Allow authenticated users to read their own albums (public or private)
CREATE POLICY "Users can view their own albums"
  ON albums FOR SELECT
  USING (auth.uid() = user_id);

-- Allow authenticated users to create their own albums
CREATE POLICY "Users can create their own albums"
  ON albums FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own albums
CREATE POLICY "Users can update their own albums"
  ON albums FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own albums
CREATE POLICY "Users can delete their own albums"
  ON albums FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for album_photos table

-- Allow all users to read photos from public albums
CREATE POLICY "Photos from public albums are viewable by everyone"
  ON album_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_photos.album_id
      AND albums.is_public = true
    )
  );

-- Allow authenticated users to read photos from their own albums
CREATE POLICY "Users can view photos from their own albums"
  ON album_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_photos.album_id
      AND albums.user_id = auth.uid()
    )
  );

-- Allow users to insert photos to their own albums
CREATE POLICY "Users can add photos to their own albums"
  ON album_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_photos.album_id
      AND albums.user_id = auth.uid()
    )
  );

-- Allow users to update photos in their own albums
CREATE POLICY "Users can update photos in their own albums"
  ON album_photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_photos.album_id
      AND albums.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_photos.album_id
      AND albums.user_id = auth.uid()
    )
  );

-- Allow users to delete photos from their own albums
CREATE POLICY "Users can delete photos from their own albums"
  ON album_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_photos.album_id
      AND albums.user_id = auth.uid()
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at on albums
CREATE TRIGGER update_albums_updated_at
  BEFORE UPDATE ON albums
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
