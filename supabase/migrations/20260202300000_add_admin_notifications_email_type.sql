-- Add admin_notifications email type for admin-only notifications
INSERT INTO "public"."email_types" (type_key, type_label, description)
VALUES (
  'admin_notifications',
  'Admin notifications',
  'Notifications for admins about new submissions and other admin-relevant events'
)
ON CONFLICT (type_key) DO NOTHING;
