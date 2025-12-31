-- Create album_tags table
CREATE TABLE IF NOT EXISTS album_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(album_id, tag)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_album_tags_album_id ON album_tags(album_id);
CREATE INDEX IF NOT EXISTS idx_album_tags_tag ON album_tags(tag);

-- Enable Row Level Security (RLS)
ALTER TABLE album_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for album_tags table

-- Allow all users to read tags from public albums
CREATE POLICY "Tags from public albums are viewable by everyone"
  ON album_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_tags.album_id
      AND albums.is_public = true
    )
  );

-- Allow authenticated users to read tags from their own albums
CREATE POLICY "Users can view tags from their own albums"
  ON album_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_tags.album_id
      AND albums.user_id = auth.uid()
    )
  );

-- Allow users to insert tags to their own albums
CREATE POLICY "Users can add tags to their own albums"
  ON album_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_tags.album_id
      AND albums.user_id = auth.uid()
    )
  );

-- Allow users to delete tags from their own albums
CREATE POLICY "Users can delete tags from their own albums"
  ON album_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_tags.album_id
      AND albums.user_id = auth.uid()
    )
  );
