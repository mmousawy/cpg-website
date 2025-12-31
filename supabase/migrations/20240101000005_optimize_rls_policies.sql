-- Optimize RLS policies by wrapping auth.uid() in subqueries
-- This prevents re-evaluation for each row and improves performance

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = id);

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Only admins can create events" ON public.events;
CREATE POLICY "Only admins can create events"
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Only admins can update events" ON public.events;
CREATE POLICY "Only admins can update events"
  ON public.events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Only admins can delete events" ON public.events;
CREATE POLICY "Only admins can delete events"
  ON public.events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- ============================================================================
-- EVENTS_RSVPS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own RSVPs" ON public.events_rsvps;
CREATE POLICY "Users can view own RSVPs"
  ON public.events_rsvps FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own RSVPs" ON public.events_rsvps;
CREATE POLICY "Users can update own RSVPs"
  ON public.events_rsvps FOR UPDATE
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all RSVPs" ON public.events_rsvps;
CREATE POLICY "Admins can view all RSVPs"
  ON public.events_rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update all RSVPs" ON public.events_rsvps;
CREATE POLICY "Admins can update all RSVPs"
  ON public.events_rsvps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- ============================================================================
-- ALBUMS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own albums" ON public.albums;
CREATE POLICY "Users can view their own albums"
  ON public.albums FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create their own albums" ON public.albums;
CREATE POLICY "Users can create their own albums"
  ON public.albums FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own albums" ON public.albums;
CREATE POLICY "Users can update their own albums"
  ON public.albums FOR UPDATE
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own albums" ON public.albums;
CREATE POLICY "Users can delete their own albums"
  ON public.albums FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- ALBUM_PHOTOS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view photos from their own albums" ON public.album_photos;
CREATE POLICY "Users can view photos from their own albums"
  ON public.album_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_photos.album_id AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can add photos to their own albums" ON public.album_photos;
CREATE POLICY "Users can add photos to their own albums"
  ON public.album_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_photos.album_id AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update photos in their own albums" ON public.album_photos;
CREATE POLICY "Users can update photos in their own albums"
  ON public.album_photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_photos.album_id AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete photos from their own albums" ON public.album_photos;
CREATE POLICY "Users can delete photos from their own albums"
  ON public.album_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_photos.album_id AND user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- ALBUM_TAGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view tags from their own albums" ON public.album_tags;
CREATE POLICY "Users can view tags from their own albums"
  ON public.album_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_tags.album_id AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can add tags to their own albums" ON public.album_tags;
CREATE POLICY "Users can add tags to their own albums"
  ON public.album_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_tags.album_id AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete tags from their own albums" ON public.album_tags;
CREATE POLICY "Users can delete tags from their own albums"
  ON public.album_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_tags.album_id AND user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- ALBUM_COMMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view comments on their own albums" ON public.album_comments;
CREATE POLICY "Users can view comments on their own albums"
  ON public.album_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_comments.album_id AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can comment on public albums" ON public.album_comments;
CREATE POLICY "Authenticated users can comment on public albums"
  ON public.album_comments FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_comments.album_id AND is_public = true
    )
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON public.album_comments;
CREATE POLICY "Users can update their own comments"
  ON public.album_comments FOR UPDATE
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.album_comments;
CREATE POLICY "Users can delete their own comments"
  ON public.album_comments FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- FIX DUPLICATE INDEX
-- ============================================================================

-- Drop the duplicate constraint (which also drops its index)
-- Keep profiles_nickname_key (the original UNIQUE constraint)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_nickname_unique;
