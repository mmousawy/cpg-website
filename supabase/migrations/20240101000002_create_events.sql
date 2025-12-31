-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id SERIAL PRIMARY KEY,
  title TEXT,
  description TEXT,
  date DATE,
  time TIME,
  location TEXT,
  cover_image TEXT,
  rsvp_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can view events
CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT
  USING (true);

-- Only admins can create events
CREATE POLICY "Only admins can create events"
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Only admins can update events
CREATE POLICY "Only admins can update events"
  ON public.events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Only admins can delete events
CREATE POLICY "Only admins can delete events"
  ON public.events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create index on date for queries
CREATE INDEX IF NOT EXISTS events_date_idx ON public.events(date);
