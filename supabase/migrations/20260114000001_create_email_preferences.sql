-- Create email_types table to define different email notification types
CREATE TABLE IF NOT EXISTS public.email_types (
  id SERIAL PRIMARY KEY,
  type_key TEXT UNIQUE NOT NULL,
  type_label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default email types
INSERT INTO public.email_types (type_key, type_label, description) VALUES
  ('events', 'Events', 'New event announcements. Note: RSVP confirmations and event updates are always sent to people who have RSVP''d, regardless of this setting.'),
  ('newsletter', 'Newsletter', 'Newsletters and general community updates'),
  ('notifications', 'Notifications', 'Notifications about likes, comments, messages, and other activity')
ON CONFLICT (type_key) DO NOTHING;

-- Create email_preferences table to track user opt-out preferences per email type
CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_type_id INTEGER NOT NULL REFERENCES public.email_types(id) ON DELETE CASCADE,
  opted_out BOOLEAN DEFAULT false NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, email_type_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON public.email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_email_type_id ON public.email_preferences(email_type_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_opted_out ON public.email_preferences(opted_out) WHERE opted_out = true;

-- Enable Row Level Security
ALTER TABLE public.email_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_types - everyone can read
DROP POLICY IF EXISTS "Email types are viewable by everyone" ON public.email_types;
CREATE POLICY "Email types are viewable by everyone"
  ON public.email_types FOR SELECT
  USING (true);

-- RLS Policies for email_preferences
-- Drop existing policies first (in case migration was partially run)
DROP POLICY IF EXISTS "Users can view own email preferences" ON public.email_preferences;
DROP POLICY IF EXISTS "Users can update own email preferences" ON public.email_preferences;
DROP POLICY IF EXISTS "Users can insert own email preferences" ON public.email_preferences;
DROP POLICY IF EXISTS "Admins can view all email preferences" ON public.email_preferences;
DROP POLICY IF EXISTS "Select email preferences policy" ON public.email_preferences;
DROP POLICY IF EXISTS "Update email preferences policy" ON public.email_preferences;
DROP POLICY IF EXISTS "Insert email preferences policy" ON public.email_preferences;

-- Consolidated SELECT policy: Users can view own preferences OR admins can view all
CREATE POLICY "Select email preferences policy"
  ON public.email_preferences FOR SELECT
  USING (
    -- Users can view their own preferences
    user_id = (SELECT auth.uid())
    -- OR admins can view all preferences
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- Users can update their own preferences
CREATE POLICY "Update email preferences policy"
  ON public.email_preferences FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
    -- Admins can also update (for support purposes)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- Users can insert their own preferences
CREATE POLICY "Insert email preferences policy"
  ON public.email_preferences FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Function to migrate existing newsletter_opt_in to new system
-- This creates preferences for users who have opted out (newsletter_opt_in = false)
CREATE OR REPLACE FUNCTION migrate_newsletter_preferences()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  newsletter_type_id INTEGER;
BEGIN
  -- Get the newsletter email type ID
  SELECT id INTO newsletter_type_id FROM public.email_types WHERE type_key = 'newsletter';
  
  IF newsletter_type_id IS NULL THEN
    RAISE EXCEPTION 'Newsletter email type not found';
  END IF;

  -- Insert preferences for users who have opted out (newsletter_opt_in = false)
  -- Only insert if they don't already have a preference
  INSERT INTO public.email_preferences (user_id, email_type_id, opted_out)
  SELECT id, newsletter_type_id, true
  FROM public.profiles
  WHERE newsletter_opt_in = false
    AND NOT EXISTS (
      SELECT 1 FROM public.email_preferences
      WHERE user_id = profiles.id AND email_type_id = newsletter_type_id
    );
END;
$$;

-- Run the migration function
SELECT migrate_newsletter_preferences();

-- Drop the migration function after use
DROP FUNCTION IF EXISTS migrate_newsletter_preferences();
