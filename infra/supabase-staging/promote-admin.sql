-- Promote a profile to admin on the **staging** Supabase instance.
-- Use when at least one admin already exists, or to promote a specific user manually.
-- For the *first* admin with email/password, use create-first-staging-admin.sql
-- (Studio SQL editor) or create-staging-admin.sh.
--
-- Usage:
--   1. Replace your-admin@example.com below
--   2. On VPS:
--
--   docker compose -p supabase-staging exec -T db psql -U postgres -d postgres \
--     < infra/supabase-staging/promote-admin.sql

SELECT set_config('request.jwt.claim.role', 'service_role', true);

UPDATE public.profiles
SET is_admin = true
WHERE email = 'your-admin@example.com';

SELECT id, email, nickname, is_admin FROM public.profiles WHERE is_admin = true;
