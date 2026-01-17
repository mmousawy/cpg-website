-- Create photo_likes table
CREATE TABLE IF NOT EXISTS photo_likes (
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (photo_id, user_id)
);

-- Create album_likes table
CREATE TABLE IF NOT EXISTS album_likes (
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (album_id, user_id)
);

-- Indexes for efficient queries
-- Drop indexes if they exist (for idempotency)
DROP INDEX IF EXISTS idx_photo_likes_photo_id;
DROP INDEX IF EXISTS idx_photo_likes_user_id;
DROP INDEX IF EXISTS idx_album_likes_album_id;
DROP INDEX IF EXISTS idx_album_likes_user_id;

CREATE INDEX idx_photo_likes_photo_id ON photo_likes(photo_id);
CREATE INDEX idx_photo_likes_user_id ON photo_likes(user_id);
CREATE INDEX idx_album_likes_album_id ON album_likes(album_id);
CREATE INDEX idx_album_likes_user_id ON album_likes(user_id);

-- Enable RLS
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photo_likes

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Photo likes are publicly readable" ON photo_likes;
DROP POLICY IF EXISTS "Authenticated users can like photos" ON photo_likes;
DROP POLICY IF EXISTS "Users can unlike their own photo likes" ON photo_likes;

-- Anyone can view likes (public photos)
CREATE POLICY "Photo likes are publicly readable" ON photo_likes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM photos
      WHERE photos.id = photo_likes.photo_id
        AND (
          photos.is_public = true
          OR photos.user_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
          )
        )
    )
  );

-- Only authenticated users can like
CREATE POLICY "Authenticated users can like photos" ON photo_likes
  FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Users can only unlike their own likes
CREATE POLICY "Users can unlike their own photo likes" ON photo_likes
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- RLS Policies for album_likes

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Album likes are publicly readable" ON album_likes;
DROP POLICY IF EXISTS "Authenticated users can like albums" ON album_likes;
DROP POLICY IF EXISTS "Users can unlike their own album likes" ON album_likes;

-- Anyone can view likes (public albums)
CREATE POLICY "Album likes are publicly readable" ON album_likes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_likes.album_id
        AND (
          albums.is_public = true
          OR albums.user_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
          )
        )
        AND albums.deleted_at IS NULL
    )
  );

-- Only authenticated users can like
CREATE POLICY "Authenticated users can like albums" ON album_likes
  FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Users can only unlike their own likes
CREATE POLICY "Users can unlike their own album likes" ON album_likes
  FOR DELETE
  USING (user_id = (select auth.uid()));
