-- Fix RLS policy performance issues by wrapping auth.uid() in subqueries
-- This ensures auth.uid() is evaluated once per query instead of once per row

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all event announcements" ON event_announcements;
DROP POLICY IF EXISTS "Admins can create event announcements" ON event_announcements;

-- Recreate policies with optimized auth.uid() calls
CREATE POLICY "Admins can view all event announcements"
  ON event_announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can create event announcements"
  ON event_announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );
