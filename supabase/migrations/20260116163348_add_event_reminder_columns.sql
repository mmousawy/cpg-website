-- Add columns to track when reminder emails have been sent for events
ALTER TABLE events 
  ADD COLUMN rsvp_reminder_sent_at timestamptz,
  ADD COLUMN attendee_reminder_sent_at timestamptz;
