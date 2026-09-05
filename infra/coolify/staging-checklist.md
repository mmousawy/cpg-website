# Staging verification checklist (Coolify)

Run against `https://staging.creativephotography.group` before production DNS cutover.

## Prerequisites

- [ ] Staging app deployed and healthy in Coolify
- [ ] `GET /api/health` returns `{"status":"ok",...}`
- [ ] Supabase Auth → URL configuration includes `https://staging.creativephotography.group/**`
- [ ] Google OAuth client: authorized redirect URI includes Supabase callback (unchanged) + site URL if required
- [ ] Discord OAuth: redirect URIs updated if you use app-specific URLs
- [ ] `NEXT_PUBLIC_SITE_URL` and `EMAIL_ASSETS_URL` set to staging URL (rebuild after change)

## Smoke tests

- [ ] Homepage, gallery, events, challenges, scene load
- [ ] Member profile (`/@username`) loads
- [ ] Login with Google
- [ ] Login with Discord
- [ ] Email/password login
- [ ] Upload a photo to an album (Supabase Storage)
- [ ] RSVP to an event (if test event exists)
- [ ] Global search (Cmd/Ctrl+K)
- [ ] Dark / light theme toggle
- [ ] No mixed-content warnings in browser devtools

## Cron (optional on staging)

- [ ] Execute **Event reminders** task once; confirm `200` in Coolify task history
- [ ] Confirm no accidental emails to real members (use test accounts only)

## SSL / Cloudflare

- [ ] Certificate valid in browser
- [ ] Cloudflare SSL mode: **Full (strict)**
- [ ] Auth cookies persist after refresh (Supabase session)

## Rollback

Production remains on Vercel until DNS is switched. To abort: delete or stop the staging app; no production impact.
