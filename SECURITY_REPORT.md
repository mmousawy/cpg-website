# Security Pentest — Remediation Report

Date: 2026-08-02  
Scope: Code-assisted review + remediation of `cpg-website`

## Summary

Critical and high-severity issues from the pentest plan were remediated in application code and a new Supabase migration. Dynamic PoCs against a live staging database were not run in this session; validation is via unit tests and code-path review.

## Critical fixes

| ID | Issue | Remediation |
|----|-------|-------------|
| C1 | Profiles PII dump via anon key | Migration restricts `profiles` SELECT columns; row policies split public / own / admin |
| C2 | Unauthenticated notify amplifiers | Notify logic inlined in create routes; legacy notify endpoints return 404 |
| C3 | Unauth service-role screenshot upload | Requires authenticated user; paths scoped per user |
| C4 | `is_admin` via profile INSERT | BEFORE INSERT trigger + `auth.users` → `handle_new_user` trigger |

## High fixes

| ID | Issue | Remediation |
|----|-------|-------------|
| H1/H2 | Open redirects | `safeInternalPath` + `getPostLoginRedirect` used in auth flows; OAuth `redirectTo` encoded |
| H3 | SSRF in OG fetch | `isSafeFetchUrl` blocks private/link-local/metadata targets |
| H4/M5 | Test/debug APIs | Dev/CI only + `INTERNAL_API_SECRET`; `/api/test-supabase` disabled |
| H6 | Suspended users keep access | Proxy blocks suspended users from account/admin/API; login rejects suspension |
| H7 | Album unsuspend bypass | DB trigger locks suspension + counter columns for non-admins |
| H8 | Draft events public | RLS policy filters `is_draft = false` for public SELECT |
| H9 | Cron fail-open | `revalidate-events` fails closed when `CRON_SECRET` unset |

## Medium fixes

- Album notify IDOR → `verifyAlbumNotifyAuthorization`
- Challenge notify → verifies photo ownership + challenge submission
- EXIF leak → gallery API excludes `exif_data`
- Json-LD XSS → `safeJsonLdStringify`
- Rich HTML → `allowProtocolRelative: false`
- Email CSS injection → `safePixelWidth`
- Signup bypass tokens → 48-char random, SHA-256 at rest, atomic consume
- Admin checks → `checkIsAdmin()` RPC (column grants safe)
- reCAPTCHA helper → returns failure on verify failure
- Shared-album oracle → `is_shared_album_member` revoked from `anon`

## Deploy steps

1. Apply migration: `supabase db push` or deploy `supabase/migrations/20260802190000_security_hardening.sql`
2. Set `INTERNAL_API_SECRET` (or reuse `CRON_SECRET`) for E2E test APIs
3. Re-run E2E with `Authorization: Bearer $INTERNAL_API_SECRET` on `/api/test/*`
4. Verify admin flows still work via `is_admin()` RPC

## Residual / accepted risk

- **H5 RSVP UUID links** — intentional capability URLs; treat UUIDs as secrets
- **M11 Storage public read** — by design for gallery; private photos rely on URL obscurity + DB `is_public`
- **M17 Unsubscribe AES-CBC** — low practical risk; consider AES-GCM in a follow-up
- **Rate limiting / CAPTCHA** — reCAPTCHA helper fixed but not yet wired to all public forms

## Files changed

- `supabase/migrations/20260802190000_security_hardening.sql`
- `src/utils/security.ts`, `src/utils/safeFetchUrl.ts`, `src/utils/postLoginRedirect.ts`
- `src/lib/notifications/notifyAdminsOf*.ts`, `src/lib/auth/*`
- API routes: feedback, reports, upload-screenshot, test/*, cron/revalidate-events, albums/notify, challenges/notify-submission, admin/*
- Auth: `auth-callback`, `LoginClient`, `AuthContext`, `actions/auth`, `proxy.ts`
