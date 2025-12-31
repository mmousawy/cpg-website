-- Consolidate multiple permissive policies into single policies for better performance
-- This eliminates the need to evaluate multiple policies for the same action

-- ============================================================================
-- ALBUMS TABLE - Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Public albums are viewable by everyone" ON public.albums;
DROP POLICY IF EXISTS "Users can view their own albums" ON public.albums;

CREATE POLICY "Users can view public albums or their own albums"
  ON public.albums FOR SELECT
  USING (is_public = true OR user_id = (select auth.uid()));

-- ============================================================================
-- ALBUM_PHOTOS TABLE - Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Photos from public albums are viewable by everyone" ON public.album_photos;
DROP POLICY IF EXISTS "Users can view photos from their own albums" ON public.album_photos;

CREATE POLICY "Users can view photos from public or own albums"
  ON public.album_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_photos.album_id
        AND (is_public = true OR user_id = (select auth.uid()))
    )
  );

-- ============================================================================
-- ALBUM_TAGS TABLE - Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Tags from public albums are viewable by everyone" ON public.album_tags;
DROP POLICY IF EXISTS "Users can view tags from their own albums" ON public.album_tags;

CREATE POLICY "Users can view tags from public or own albums"
  ON public.album_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_tags.album_id
        AND (is_public = true OR user_id = (select auth.uid()))
    )
  );

-- ============================================================================
-- ALBUM_COMMENTS TABLE - Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Comments on public albums are viewable by everyone" ON public.album_comments;
DROP POLICY IF EXISTS "Users can view comments on their own albums" ON public.album_comments;

CREATE POLICY "Users can view comments on public or own albums"
  ON public.album_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_comments.album_id
        AND (is_public = true OR user_id = (select auth.uid()))
    )
  );

-- ============================================================================
-- EVENTS_RSVPS TABLE - Consolidate SELECT and UPDATE policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all RSVPs" ON public.events_rsvps;
DROP POLICY IF EXISTS "Users can view own RSVPs" ON public.events_rsvps;

CREATE POLICY "Users can view own RSVPs or admins can view all"
  ON public.events_rsvps FOR SELECT
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update all RSVPs" ON public.events_rsvps;
DROP POLICY IF EXISTS "Users can update own RSVPs" ON public.events_rsvps;

CREATE POLICY "Users can update own RSVPs or admins can update all"
  ON public.events_rsvps FOR UPDATE
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );
