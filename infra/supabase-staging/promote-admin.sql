-- Promote the first admin on the **staging** Supabase instance.
-- Run after OAuth login created auth.users + profiles rows.
--
-- Replace the email, then:
--   docker compose -p supabase-staging exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < promote-admin.sql
--
-- Or interactively:
--   docker compose -p supabase-staging exec db psql -U postgres -d postgres

UPDATE public.profiles
SET is_admin = true
WHERE email = 'your-admin@example.com';

-- Verify
SELECT id, email, nickname, is_admin FROM public.profiles WHERE is_admin = true;
