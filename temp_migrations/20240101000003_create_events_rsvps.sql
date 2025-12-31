-- Create events RSVPs table
CREATE TABLE IF NOT EXISTS public.events_rsvps (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  uuid UUID UNIQUE DEFAULT gen_random_uuid(),
  ip_address TEXT,
  confirmed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  attended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.events_rsvps ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view their own RSVPs
CREATE POLICY "Users can view own RSVPs"
  ON public.events_rsvps FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Anyone can insert RSVPs (for signup)
CREATE POLICY "Anyone can create RSVPs"
  ON public.events_rsvps FOR INSERT
  WITH CHECK (true);

-- Users can update their own RSVPs
CREATE POLICY "Users can update own RSVPs"
  ON public.events_rsvps FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all RSVPs
CREATE POLICY "Admins can view all RSVPs"
  ON public.events_rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update all RSVPs
CREATE POLICY "Admins can update all RSVPs"
  ON public.events_rsvps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS events_rsvps_event_id_idx ON public.events_rsvps(event_id);
CREATE INDEX IF NOT EXISTS events_rsvps_user_id_idx ON public.events_rsvps(user_id);
CREATE INDEX IF NOT EXISTS events_rsvps_uuid_idx ON public.events_rsvps(uuid);
CREATE INDEX IF NOT EXISTS events_rsvps_email_idx ON public.events_rsvps(email);
