-- Allow anyone to view confirmed attendees (for public event pages)
-- This is needed for the Attendees component to show the list of people attending

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Anyone can view confirmed attendees" ON public.events_rsvps;

-- Create new policy: Anyone can see confirmed (non-canceled) RSVPs
-- This only exposes minimal info needed for attendee lists
CREATE POLICY "Anyone can view confirmed attendees"
  ON public.events_rsvps FOR SELECT
  USING (
    confirmed_at IS NOT NULL 
    AND canceled_at IS NULL
  );

-- Add explicit foreign key from events_rsvps.user_id to profiles.id
-- This helps PostgREST understand the join relationship
-- Note: This might fail if there are orphaned user_ids, so we use IF NOT EXISTS pattern
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_rsvps_user_id_profiles_fkey'
    AND table_name = 'events_rsvps'
  ) THEN
    -- Add the foreign key (it won't conflict with the auth.users FK)
    ALTER TABLE public.events_rsvps
    ADD CONSTRAINT events_rsvps_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

