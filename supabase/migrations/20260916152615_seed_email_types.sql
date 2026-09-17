-- Lookup rows for email_types were never part of the schema dump.
-- Fresh environments (including staging) therefore had an empty table, so
-- onboarding showed "Unable to load email preferences".
-- Idempotent: production already has these rows.

INSERT INTO public.email_types (type_key, type_label, description)
VALUES
  ('events', 'Events', 'Emails about upcoming events'),
  ('newsletter', 'Newsletter', 'Newsletters and general community updates'),
  ('notifications', 'Notifications', 'Notifications about likes, comments, messages, and other activity'),
  ('weekly_digest', 'Weekly Digest', 'A weekly summary of your unseen notifications'),
  ('photo_challenges', 'Photo Challenges', 'Notifications about new photo challenges'),
  ('challenge_comment', 'Challenge comments', 'Notifications when someone comments on a challenge you participated in'),
  ('admin_notifications', 'Admin notifications', 'Notifications for admins about new submissions and other admin-relevant events')
ON CONFLICT (type_key) DO NOTHING;
