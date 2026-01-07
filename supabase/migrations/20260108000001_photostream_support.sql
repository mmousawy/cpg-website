-- ============================================================================
-- PHOTOSTREAM SUPPORT MIGRATION
-- ============================================================================
-- This migration:
-- 1. Renames images table to photos for consistency
-- 2. Renames uploaded_by column to user_id for consistency
-- 3. Adds photostream columns (title, description, is_public, sort_order, blurhash)
-- 4. Creates performance indexes
-- 5. Creates scalable comments structure with junction tables
-- 6. Updates RLS policies
-- 7. Migrates existing album_comments data to new structure
-- ============================================================================

-- ============================================================================
-- STEP 1: Rename table and column
-- ============================================================================

-- Rename table
ALTER TABLE public.images RENAME TO photos;

-- Rename column: uploaded_by → user_id (consistency with albums, events_rsvps, etc.)
ALTER TABLE public.photos RENAME COLUMN uploaded_by TO user_id;

-- Rename indexes to match new table/column names
ALTER INDEX IF EXISTS idx_images_storage_path RENAME TO idx_photos_storage_path;
ALTER INDEX IF EXISTS idx_images_url RENAME TO idx_photos_url;
ALTER INDEX IF EXISTS idx_images_uploaded_by RENAME TO idx_photos_user_id;

-- Update FK constraint name on album_photos
ALTER TABLE public.album_photos 
  DROP CONSTRAINT IF EXISTS fk_album_photos_image_url;
ALTER TABLE public.album_photos
  ADD CONSTRAINT fk_album_photos_photo_url 
  FOREIGN KEY (photo_url) REFERENCES photos(url) ON DELETE SET NULL;

-- ============================================================================
-- STEP 2: Add photostream columns to photos table
-- ============================================================================

ALTER TABLE public.photos 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER,
  ADD COLUMN IF NOT EXISTS blurhash TEXT;

-- ============================================================================
-- STEP 3: Performance Indexes (Critical for Scale)
-- ============================================================================

-- Public photostream query: partial index for efficiency
CREATE INDEX IF NOT EXISTS idx_photos_user_public 
  ON public.photos(user_id, created_at DESC) 
  WHERE is_public = true;

-- Account photos query
CREATE INDEX IF NOT EXISTS idx_photos_user_all 
  ON public.photos(user_id, created_at DESC);

-- Custom sort order query
CREATE INDEX IF NOT EXISTS idx_photos_user_sorted 
  ON public.photos(user_id, sort_order NULLS LAST, created_at DESC);

-- ============================================================================
-- STEP 4: Album Photos Constraint
-- ============================================================================

-- Prevent duplicate photo-album associations
ALTER TABLE public.album_photos 
  ADD CONSTRAINT album_photos_unique_photo UNIQUE (album_id, photo_url);

-- ============================================================================
-- STEP 5: Scalable Comments Structure (Junction Tables)
-- ============================================================================

-- Core comments table (lean, no entity-specific columns)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- Drop old RLS policies on album_comments before renaming
DROP POLICY IF EXISTS "Select album comments policy" ON public.album_comments;
DROP POLICY IF EXISTS "Comments on public albums are viewable by everyone" ON public.album_comments;
DROP POLICY IF EXISTS "Users can view comments on their own albums" ON public.album_comments;
DROP POLICY IF EXISTS "Users can view comments on public or own albums" ON public.album_comments;
DROP POLICY IF EXISTS "Authenticated users can comment on public albums" ON public.album_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.album_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.album_comments;

-- Rename old album_comments table to preserve it during migration
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'album_comments' AND table_schema = 'public') THEN
    ALTER TABLE public.album_comments RENAME TO album_comments_old;
  END IF;
END $$;

-- Junction table: album comments (new structure)
CREATE TABLE IF NOT EXISTS public.album_comments (
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  PRIMARY KEY (album_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_album_comments_album ON album_comments(album_id);
CREATE INDEX IF NOT EXISTS idx_album_comments_comment ON album_comments(comment_id);

-- Junction table: photo comments
CREATE TABLE IF NOT EXISTS public.photo_comments (
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_comments_photo ON photo_comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_comment ON photo_comments(comment_id);

-- ============================================================================
-- STEP 6: Migrate existing album_comments data
-- ============================================================================

-- Migrate existing album_comments_old to new structure
INSERT INTO public.comments (id, user_id, comment_text, created_at, updated_at)
SELECT id, user_id, comment_text, created_at, updated_at
FROM public.album_comments_old
ON CONFLICT (id) DO NOTHING;

-- Create junction links for migrated comments
INSERT INTO public.album_comments (album_id, comment_id)
SELECT album_id, id
FROM public.album_comments_old
ON CONFLICT DO NOTHING;

-- Drop old album_comments table (now that data is migrated)
DROP TABLE IF EXISTS public.album_comments_old;

-- ============================================================================
-- STEP 7: RLS Policies for Comments
-- ============================================================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

-- Comments: users can manage their own
CREATE POLICY "Users can insert own comments" ON comments
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Comments are viewable if user owns them or they're linked to public content
CREATE POLICY "View accessible comments" ON comments
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM album_comments ac
      JOIN albums a ON a.id = ac.album_id
      WHERE ac.comment_id = comments.id 
        AND (a.is_public = true OR a.user_id = (SELECT auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM photo_comments pc
      JOIN photos p ON p.id = pc.photo_id
      WHERE pc.comment_id = comments.id 
        AND (p.is_public = true OR p.user_id = (SELECT auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- Album comments junction: viewable if album is accessible
CREATE POLICY "View album comment links" ON album_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM albums 
      WHERE id = album_comments.album_id 
        AND (
          user_id = (SELECT auth.uid())
          OR (is_public = true AND (is_suspended IS NULL OR is_suspended = false))
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND is_admin = true
          )
        )
    )
  );

CREATE POLICY "Insert album comment links" ON album_comments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM comments WHERE id = comment_id AND user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Delete album comment links" ON album_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM comments c
      JOIN album_comments ac ON c.id = ac.comment_id
      WHERE ac.comment_id = album_comments.comment_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- Photo comments junction: viewable if photo is accessible
CREATE POLICY "View photo comment links" ON photo_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photos 
      WHERE id = photo_comments.photo_id 
        AND (
          user_id = (SELECT auth.uid())
          OR is_public = true
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND is_admin = true
          )
        )
    )
  );

CREATE POLICY "Insert photo comment links" ON photo_comments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM comments WHERE id = comment_id AND user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Delete photo comment links" ON photo_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM comments c
      JOIN photo_comments pc ON c.id = pc.comment_id
      WHERE pc.comment_id = photo_comments.comment_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- STEP 8: Updated RLS Policies for Photos Table
-- ============================================================================

-- Drop old policies (reference old 'images' name internally)
DROP POLICY IF EXISTS "Anyone can view image metadata" ON public.photos;
DROP POLICY IF EXISTS "Users can insert own image metadata" ON public.photos;
DROP POLICY IF EXISTS "Users can update own image metadata" ON public.photos;
DROP POLICY IF EXISTS "Users can delete own image metadata" ON public.photos;
DROP POLICY IF EXISTS "Only admins can insert image metadata" ON public.photos;
DROP POLICY IF EXISTS "Only admins can delete image metadata" ON public.photos;

-- SELECT: view public photos OR your own photos OR admin can see all
CREATE POLICY "View public or own photos"
  ON public.photos FOR SELECT
  USING (
    is_public = true 
    OR user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- INSERT: users can add their own photos
CREATE POLICY "Users can insert own photos"
  ON public.photos FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- UPDATE: users can update their own photos
CREATE POLICY "Users can update own photos"
  ON public.photos FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- DELETE: users can delete their own photos
CREATE POLICY "Users can delete own photos"
  ON public.photos FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- ============================================================================
-- STEP 9: Create trigger for comments updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_updated_at();

