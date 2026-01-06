-- ============================================================================
-- CONSOLIDATED RLS POLICIES
-- This replaces the redundant policies from:
--   - 20240101000005_optimize_rls_policies.sql
--   - 20240101000006_consolidate_duplicate_policies.sql  
--   - 20251231000003_fix_rsvps_public_view.sql
--   - 20260102000001_add_album_moderation.sql (policy parts only)
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id);

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Only admins can create events" ON public.events;
CREATE POLICY "Only admins can create events"
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Only admins can update events" ON public.events;
CREATE POLICY "Only admins can update events"
  ON public.events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Only admins can delete events" ON public.events;
CREATE POLICY "Only admins can delete events"
  ON public.events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- ============================================================================
-- EVENTS_RSVPS TABLE - CONSOLIDATED
-- ============================================================================

-- Drop all old SELECT policies
DROP POLICY IF EXISTS "Anyone can view confirmed attendees" ON public.events_rsvps;
DROP POLICY IF EXISTS "Users can view own RSVPs or admins can view all" ON public.events_rsvps;
DROP POLICY IF EXISTS "Users can view own RSVPs" ON public.events_rsvps;
DROP POLICY IF EXISTS "Admins can view all RSVPs" ON public.events_rsvps;
DROP POLICY IF EXISTS "Select RSVPs policy" ON public.events_rsvps;

-- Single consolidated SELECT policy
CREATE POLICY "Select RSVPs policy"
  ON public.events_rsvps FOR SELECT
  USING (
    -- Anyone can see confirmed, non-canceled RSVPs (for public attendee lists)
    (confirmed_at IS NOT NULL AND canceled_at IS NULL)
    -- Users can see their own RSVPs
    OR user_id = (SELECT auth.uid())
    -- Admins can see all RSVPs
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- Drop all old UPDATE policies
DROP POLICY IF EXISTS "Users can update own RSVPs or admins can update all" ON public.events_rsvps;
DROP POLICY IF EXISTS "Users can update own RSVPs" ON public.events_rsvps;
DROP POLICY IF EXISTS "Admins can update all RSVPs" ON public.events_rsvps;
DROP POLICY IF EXISTS "Update RSVPs policy" ON public.events_rsvps;

-- Single consolidated UPDATE policy
CREATE POLICY "Update RSVPs policy"
  ON public.events_rsvps FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- ============================================================================
-- ALBUMS TABLE - CONSOLIDATED
-- ============================================================================

-- Drop all old SELECT policies
DROP POLICY IF EXISTS "Users can view public albums or their own albums" ON public.albums;
DROP POLICY IF EXISTS "Public albums are viewable by everyone" ON public.albums;
DROP POLICY IF EXISTS "Users can view their own albums" ON public.albums;
DROP POLICY IF EXISTS "Select albums policy" ON public.albums;

-- Single consolidated SELECT policy (includes admin visibility and suspension handling)
CREATE POLICY "Select albums policy"
  ON public.albums FOR SELECT
  USING (
    -- User can see their own albums (suspended or not)
    user_id = (SELECT auth.uid())
    -- Anyone can see public, non-suspended albums
    OR (is_public = true AND (is_suspended IS NULL OR is_suspended = false))
    -- Admins can see all albums
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can create their own albums" ON public.albums;
CREATE POLICY "Users can create their own albums"
  ON public.albums FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Drop all old UPDATE policies
DROP POLICY IF EXISTS "Users can update their own albums" ON public.albums;
DROP POLICY IF EXISTS "Admins can update any album" ON public.albums;
DROP POLICY IF EXISTS "Update albums policy" ON public.albums;

-- Single consolidated UPDATE policy
CREATE POLICY "Update albums policy"
  ON public.albums FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- Drop all old DELETE policies
DROP POLICY IF EXISTS "Users can delete their own albums" ON public.albums;
DROP POLICY IF EXISTS "Admins can delete any album" ON public.albums;
DROP POLICY IF EXISTS "Delete albums policy" ON public.albums;

-- Single consolidated DELETE policy
CREATE POLICY "Delete albums policy"
  ON public.albums FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- ============================================================================
-- ALBUM_PHOTOS TABLE - CONSOLIDATED
-- ============================================================================

DROP POLICY IF EXISTS "Users can view photos from public or own albums" ON public.album_photos;
DROP POLICY IF EXISTS "Photos from public albums are viewable by everyone" ON public.album_photos;
DROP POLICY IF EXISTS "Users can view photos from their own albums" ON public.album_photos;
DROP POLICY IF EXISTS "Select album photos policy" ON public.album_photos;

CREATE POLICY "Select album photos policy"
  ON public.album_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_photos.album_id
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

DROP POLICY IF EXISTS "Users can add photos to their own albums" ON public.album_photos;
CREATE POLICY "Users can add photos to their own albums"
  ON public.album_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_photos.album_id AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update photos in their own albums" ON public.album_photos;
CREATE POLICY "Users can update photos in their own albums"
  ON public.album_photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_photos.album_id AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete photos from their own albums" ON public.album_photos;
CREATE POLICY "Users can delete photos from their own albums"
  ON public.album_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_photos.album_id AND user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- ALBUM_TAGS TABLE - CONSOLIDATED
-- ============================================================================

DROP POLICY IF EXISTS "Users can view tags from public or own albums" ON public.album_tags;
DROP POLICY IF EXISTS "Tags from public albums are viewable by everyone" ON public.album_tags;
DROP POLICY IF EXISTS "Users can view tags from their own albums" ON public.album_tags;
DROP POLICY IF EXISTS "Select album tags policy" ON public.album_tags;

CREATE POLICY "Select album tags policy"
  ON public.album_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_tags.album_id
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

DROP POLICY IF EXISTS "Users can add tags to their own albums" ON public.album_tags;
CREATE POLICY "Users can add tags to their own albums"
  ON public.album_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_tags.album_id AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete tags from their own albums" ON public.album_tags;
CREATE POLICY "Users can delete tags from their own albums"
  ON public.album_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_tags.album_id AND user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- ALBUM_COMMENTS TABLE - CONSOLIDATED
-- ============================================================================

DROP POLICY IF EXISTS "Users can view comments on public or own albums" ON public.album_comments;
DROP POLICY IF EXISTS "Comments on public albums are viewable by everyone" ON public.album_comments;
DROP POLICY IF EXISTS "Users can view comments on their own albums" ON public.album_comments;
DROP POLICY IF EXISTS "Select album comments policy" ON public.album_comments;

CREATE POLICY "Select album comments policy"
  ON public.album_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.albums
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

DROP POLICY IF EXISTS "Authenticated users can comment on public albums" ON public.album_comments;
CREATE POLICY "Authenticated users can comment on public albums"
  ON public.album_comments FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.albums
      WHERE id = album_comments.album_id AND is_public = true
    )
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON public.album_comments;
CREATE POLICY "Users can update their own comments"
  ON public.album_comments FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.album_comments;
CREATE POLICY "Users can delete their own comments"
  ON public.album_comments FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- FIX DUPLICATE INDEX (from optimize_rls_policies)
-- ============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_nickname_unique;

-- ============================================================================
-- ADD FK CONSTRAINT (from fix_rsvps_public_view)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_rsvps_user_id_profiles_fkey'
    AND table_name = 'events_rsvps'
  ) THEN
    ALTER TABLE public.events_rsvps
    ADD CONSTRAINT events_rsvps_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

