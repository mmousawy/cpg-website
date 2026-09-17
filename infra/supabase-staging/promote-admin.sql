-- Promote a profile to admin on the **staging** Supabase instance.
-- Use when at least one admin already exists, or to promote a specific user manually.
-- For the *first* admin with email/password, use create-first-staging-admin.sql
-- (Studio SQL editor) or create-staging-admin.sh.
--
-- Requires the promote_admin() migration. Creates a profiles row from
-- auth.users when the user has signed in but has no profile yet.
--
-- Usage:
--   1. Replace your-admin@example.com below
--   2. On VPS:
--
--   docker compose -p supabase-staging exec -T db psql -U postgres -d postgres \
--     < infra/supabase-staging/promote-admin.sql
--
-- Or in Studio / psql:
--   SELECT * FROM public.promote_admin('your-admin@example.com');

SELECT * FROM public.promote_admin('your-admin@example.com');
