# Production verification checklist (Coolify)

Run after [production-cutover.md](./production-cutover.md) DNS points at the VPS.

## Infrastructure

- [ ] Production Coolify app healthy (`127.0.0.1:3000->3000` port mapping — default)
- [ ] `curl -fsS http://127.0.0.1:3000/api/health` on VPS
- [ ] Nginx vhost for `creativephotography.group` + `www` → `:3000` ([nginx-production.conf](./nginx-production.conf))
- [ ] Nginx proxy buffers + Connection map applied on VPS: `sudo bash infra/coolify/fix-nginx-proxy-headers.sh` (prevents logged-in `sb-*-auth-token` 502s)
- [ ] Staging still on host `:2000` (not conflicting with prod `:3000`) — see [PORTS.md](./PORTS.md)
- [ ] TLS valid (certbot / Cloudflare Full strict)
- [ ] `https://creativephotography.group/api/health` returns ok
- [ ] `https://www.creativephotography.group` redirects or serves same app

## Coolify app

- [ ] Branch `main` (or deploy-only via release webhook)
- [ ] `NEXT_PUBLIC_SITE_URL=https://creativephotography.group` (rebuild after change)
- [ ] `NEXT_PUBLIC_SUPABASE_URL=https://db.creativephotography.group` (production Supabase)
- [ ] Production anon + service role keys (not staging)
- [ ] All secrets copied from former Vercel env
- [ ] Scheduled tasks from [scheduled-tasks.md](./scheduled-tasks.md) (use `http://127.0.0.1:3000` **inside** the container)

## Supabase / OAuth

- [ ] imgproxy preserves ICC on `/render/image` WebP — run on VPS (Coolify server terminal or SSH): `bash infra/apply-imgproxy-preserve-icc.sh production` ([runbook](../imgproxy-color-profiles.md))
- [ ] After imgproxy change: Cloudflare purge `/storage/v1/render/image/*` on `db.creativephotography.group` (no Coolify redeploy needed)
- [ ] Auth Site URL: `https://creativephotography.group`
- [ ] Redirect URLs: `https://creativephotography.group/**`, `https://www.creativephotography.group/**`
- [ ] Google / Discord **enabled inside Auth** — `docker exec supabase-auth env | grep GOTRUE_EXTERNAL_GOOGLE` must show `ENABLED=true` (`.env` alone is not enough; run `bash infra/apply-supabase-oauth.sh production` — [runbook](../supabase-oauth.md))
- [ ] Google / Discord callback in provider consoles: `https://db.creativephotography.group/auth/v1/callback`

## Smoke tests

- [ ] Homepage, gallery, events, login (Google, Discord, email)
- [ ] Upload photo, RSVP, search
- [ ] Admin panel
- [ ] No `/_vercel/insights` requests in network tab (self-hosted)
- [ ] Execute one cron task manually in Coolify; confirm 200

## GitHub / releases

- [ ] `COOLIFY_PRODUCTION_WEBHOOK_URL` set → Release Please triggers Coolify deploy
- [ ] Optional: `E2E_BASE_URL` for PR tests against staging (see [ci.yml](../../.github/workflows/ci.yml))

## Rollback

Point Cloudflare `@` / `www` back to Vercel until you retire the Vercel project.
