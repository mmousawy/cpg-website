# Staging verification checklist (Coolify + isolated Supabase)

Run against `https://staging.creativephotography.group` before treating staging as safe to experiment on.

**Before deploying:** read [vps-resources.md](./vps-resources.md) — do not run prod + staging builds at once on this VPS.

## Staging Supabase (`/data/supabase-staging`)

- [ ] Override installed: `/data/supabase-staging/docker-compose.override.yml` (unique `supabase-staging-*` container names)
- [ ] Stack running: `docker compose -p supabase-staging ps` — all healthy
- [ ] `curl -fsS http://127.0.0.1:8002/auth/v1/health` on VPS
- [ ] `curl -fsS https://db-staging.creativephotography.group/auth/v1/health`
- [ ] Staging `.env` has **new** `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` (not copied from prod)
- [ ] Migrations applied: `./infra/supabase-staging/migrate-staging.sh "$STAGING_DB_URL"`
- [ ] Staging admin promoted ([promote-admin.sql](../supabase-staging/promote-admin.sql))
- [ ] Google / Discord **enabled inside Auth** — `docker exec supabase-staging-auth env | grep GOTRUE_EXTERNAL_GOOGLE` must show `ENABLED=true` (`.env` alone is not enough; run `bash infra/apply-supabase-oauth.sh staging` — [runbook](../supabase-oauth.md))
- [ ] Google / Discord OAuth callback: `https://db-staging.creativephotography.group/auth/v1/callback`
- [ ] imgproxy preserves ICC: `bash infra/apply-imgproxy-preserve-icc.sh staging` on VPS ([imgproxy-color-profiles.md](../imgproxy-color-profiles.md)); `pnpm verify:image-icc` passes on a wide-gamut staging upload

Full setup: [infra/supabase-staging/README.md](../supabase-staging/README.md).

## Staging Next.js (Coolify)

- [ ] Port mapping `127.0.0.1:2000->3000` ([PORTS.md](./PORTS.md))
- [ ] `curl -fsS http://127.0.0.1:2000/api/health` on VPS
- [ ] Nginx staging vhost → `:2000` ([nginx-staging.conf](./nginx-staging.conf))
- [ ] Nginx proxy buffers + Connection map on VPS: `sudo bash infra/coolify/fix-nginx-proxy-headers.sh`
- [ ] `curl -fsS https://staging.creativephotography.group/api/health`
- [ ] Coolify env uses **staging** Supabase URL and keys (not production)
- [ ] `NEXT_PUBLIC_SITE_URL` and `EMAIL_ASSETS_URL` = `https://staging.creativephotography.group` (rebuild after change)
- [ ] Browser Network tab: requests go to `db-staging.creativephotography.group`, not `db.creativephotography.group`
- [ ] Coolify **scheduled tasks disabled** on staging (or Resend test key only)
- [ ] Staging GoTrue: public signup disabled (`GOTRUE_DISABLE_SIGNUP=true`); Site URL = staging site

## Smoke tests (invite-only signup)

- [ ] Public pages (home, gallery, events) load without signing in
- [ ] `/signup` without `?bypass=` redirects to login
- [ ] `/signup?bypass=` (admin generator or E2E `/api/test/signup-bypass`) can create a member account
- [ ] Regular (non-admin) members can log in and use `/account`
- [ ] Login with Google / Discord as promoted admin still reaches `/admin`
- [ ] Homepage, gallery, events, challenges load (empty until seeded)
- [ ] Upload a photo — lands in **staging** storage only
- [ ] Create test event on staging — **not** visible on production
- [ ] Global search (Cmd/Ctrl+K)
- [ ] No mixed-content warnings in devtools

## SSL / Cloudflare

- [ ] **DNS:** `db-staging` A → `57.129.6.153` (see [supabase-staging README](../supabase-staging/README.md) §4b)
- [ ] Certificate valid for `staging` and `db-staging` subdomains
- [ ] Cloudflare SSL mode: **Full (strict)**
- [ ] Auth cookies persist after refresh
- [ ] `staging.creativephotography.group` serves Next.js (not Coolify dashboard on `:9000`)

## Rollback

`docker compose -p supabase-staging down` or revert Coolify staging env to prod keys. Production at `/home/ubuntu/supabase-project` is unaffected.
