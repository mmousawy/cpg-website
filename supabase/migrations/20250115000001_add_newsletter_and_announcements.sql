-- Add newsletter opt-in field to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS newsletter_opt_in BOOLEAN DEFAULT false NOT NULL;

-- Create event_announcements tracking table
CREATE TABLE IF NOT EXISTS event_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  announced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  announced_by UUID REFERENCES profiles(id),
  recipient_count INTEGER NOT NULL,
  UNIQUE(event_id) -- Only one announcement per event
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_announcements_event_id ON event_announcements(event_id);
CREATE INDEX IF NOT EXISTS idx_event_announcements_announced_by ON event_announcements(announced_by);

-- Add RLS policies for event_announcements
ALTER TABLE event_announcements ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all announcements
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

-- Allow admins to insert announcements
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
