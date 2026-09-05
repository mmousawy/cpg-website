# Staging verification checklist (Coolify)

Run against `https://staging.creativephotography.group` before production DNS cutover.

## Prerequisites

- [ ] Isolated staging Supabase running ([infra/supabase-staging/README.md](../supabase-staging/README.md))
- [ ] `curl -fsS https://db-staging.creativephotography.group/auth/v1/health` succeeds
- [ ] Migrations applied (empty content; no prod dump)
- [ ] Staging admin promoted (`infra/supabase-staging/promote-admin.sql`)
- [ ] Staging app deployed and healthy in Coolify (`127.0.0.1:2000->3000` — host port 1000 below prod)
- [ ] `curl -fsS http://127.0.0.1:2000/api/health` on VPS
- [ ] Nginx staging vhost → `:2000` ([nginx-staging.conf](./nginx-staging.conf), [PORTS.md](./PORTS.md))
- [ ] `GET /api/health` returns `{"status":"ok",...}`
- [ ] Coolify env uses **staging** Supabase URL and keys (not production)
- [ ] `NEXT_PUBLIC_SITE_URL` and `EMAIL_ASSETS_URL` = `https://staging.creativephotography.group` (rebuild after change)
- [ ] Google OAuth: redirect URI `https://db-staging.creativephotography.group/auth/v1/callback`
- [ ] Discord OAuth: same callback on staging Kong host
- [ ] Staging GoTrue: signup disabled; Site URL = staging site
- [ ] Coolify **scheduled tasks disabled** on staging (or Resend test key only)

## Smoke tests (admin login required)

- [ ] Non-admin / anonymous users redirected to login on staging
- [ ] `/signup` redirects to login on staging
- [ ] Login with Google / Discord as promoted admin
- [ ] Homepage, gallery, events, challenges load (empty until you seed staging)
- [ ] Upload a photo to an album (lands in **staging** storage buckets)
- [ ] Create a test event on staging; confirm production events unchanged
- [ ] Global search (Cmd/Ctrl+K)
- [ ] No mixed-content warnings in browser devtools

## SSL / Cloudflare

- [ ] Certificate valid for `staging` and `db-staging` subdomains
- [ ] Cloudflare SSL mode: **Full (strict)**
- [ ] Auth cookies persist after refresh

## Rollback

Stop staging Supabase (`docker compose -p supabase-staging down`) or point Coolify back at production keys. Production stack is unaffected.
