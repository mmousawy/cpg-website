-- Add moderation fields to albums table for admin moderation
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Create index for faster filtering of suspended albums
CREATE INDEX IF NOT EXISTS idx_albums_is_suspended ON public.albums(is_suspended) WHERE is_suspended = true;

-- Update the public albums policy to exclude suspended albums
DROP POLICY IF EXISTS "Users can view public albums or their own albums" ON public.albums;

CREATE POLICY "Users can view public albums or their own albums"
  ON public.albums FOR SELECT
  USING (
    -- User can see their own albums (suspended or not)
    user_id = (select auth.uid())
    OR
    -- Anyone can see public albums that are not suspended
    (is_public = true AND (is_suspended = false OR is_suspended IS NULL))
    OR
    -- Admins can see all albums
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- Allow admins to update any album (for moderation)
DROP POLICY IF EXISTS "Admins can update any album" ON public.albums;
CREATE POLICY "Admins can update any album"
  ON public.albums FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- Allow admins to delete any album (for moderation)
DROP POLICY IF EXISTS "Admins can delete any album" ON public.albums;
CREATE POLICY "Admins can delete any album"
  ON public.albums FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

