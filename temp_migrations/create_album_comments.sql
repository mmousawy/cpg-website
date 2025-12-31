-- Create album_comments table
CREATE TABLE IF NOT EXISTS album_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_album_comments_album_id ON album_comments(album_id);
CREATE INDEX IF NOT EXISTS idx_album_comments_user_id ON album_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_album_comments_created_at ON album_comments(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE album_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for album_comments table

-- Allow all users to read comments on public albums
CREATE POLICY "Comments on public albums are viewable by everyone"
  ON album_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_comments.album_id
      AND albums.is_public = true
    )
  );

-- Allow authenticated users to read comments on their own albums
CREATE POLICY "Users can view comments on their own albums"
  ON album_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_comments.album_id
      AND albums.user_id = auth.uid()
    )
  );

-- Allow authenticated users to create comments on public albums
CREATE POLICY "Authenticated users can comment on public albums"
  ON album_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_comments.album_id
      AND albums.is_public = true
    )
  );

-- Allow users to update their own comments
CREATE POLICY "Users can update their own comments"
  ON album_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON album_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_album_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at on album_comments
CREATE TRIGGER update_album_comments_updated_at
  BEFORE UPDATE ON album_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_album_comments_updated_at();
