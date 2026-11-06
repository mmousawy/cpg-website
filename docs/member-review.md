# Member review and repeat signup blocking

This document describes how new members are held, suspended, or published, and how repeat abusers are blocked.

## Outcomes after onboarding

Onboarding finishes through [`POST /api/onboarding/complete`](../src/app/api/onboarding/complete/route.ts). That route runs link checks and moderation in one write.

| Outcome | When | Member experience |
|--------|------|-------------------|
| **Publish** | No advertising signal and no inconclusive URL | Public profile; admins get member-joined notification |
| **Under review** | A URL was checked and the verdict was inconclusive, or the display name/bio looks like a business | Signed in and can browse; likes, comments, follows, RSVPs, and other writes are blocked; `/account` and their public profile stay locked until an admin approves |
| **Suspend** | Clear advertising, unsafe URL, repeat of a suspended member, or overlapping host/name/IP | Signed out; `suspended_at` set; automated report filed |

Saving website, bio, or social links later ([`POST /api/account/profile-links`](../src/app/api/account/profile-links/route.ts)) runs the same hold/suspend checks. Clear ads still hide the link; the member is also held or suspended so they cannot stay public after adding the site.

## Link and text checks (Phase 1)

- Website, social links, and URLs in the bio are fetched and classified ([`src/lib/profileUrl/`](../src/lib/profileUrl/)).
- Display name and bio are scanned for service pitches ([`isServiceOfferText`](../src/lib/profileUrl/classifyPageContent.ts)) and weaker business-like wording ([`looksLikeCommercialProfileText`](../src/lib/profileUrl/classifyPageContent.ts)). A name like “Great Tibet Tour” is held even with no website.
- Hosts already used on a **suspended** profile are treated as advertising.

Local URL testing: `pnpm check:urls scripts/example-profile-urls.txt`

## Repeat signup blocking (Phase 2)

When onboarding completes, the server compares the new account to **suspended** members on:

- Client IP (in `blocked_ips`, or stored on a suspended member’s `signup_signals` row)
- Nickname stem (nickname with trailing digits removed; prefix match when stems are at least 4 characters)
- Display name (exact match, case-insensitive)
- Link host (website, social, or bio URL)

A match suspends immediately with reason `Repeat of a suspended account`.

### Tables

- **`signup_signals`** — one row per profile: browser IP, user agent, and `Accept-Language` from email signup, OAuth callback, or onboarding complete. Rows with user agent `node` or missing IP are not stored (server-side auth sessions).
- **`blocked_ips`** — client IPs refused by the proxy. Added when a member is suspended (automatic or admin). Removed when an admin unsuspends that member.

Migrations: [`20261105153000_profile_under_review.sql`](../supabase/migrations/20261105153000_profile_under_review.sql), [`20261106010000_signup_signals_blocked_ips.sql`](../supabase/migrations/20261106010000_signup_signals_blocked_ips.sql).

### Proxy and signup

- [`src/proxy.ts`](../src/proxy.ts) redirects blocked IPs to [`/network-blocked`](../src/app/network-blocked/page.tsx) before other handling. That page is the only site route they can open.
- Held members can browse, but mutating `/api/*` calls return 403 except auth, contact, views, unsubscribe, notifications, onboarding revalidate, and feedback. The UI also disables likes, comments, follows, RSVPs, reports, and similar actions.
- Local preview (does not bypass a real hold or IP block): `?preview-block=true` / `?preview-block=false` for the blocked screen; `?preview-review=true` / `?preview-review=false` for the under-review screen.
- [`/api/auth/signup`](../src/app/api/auth/signup/route.ts) returns 403 for blocked IPs.
- [`/auth-callback`](../src/app/auth-callback/route.ts) redirects blocked IPs to `/network-blocked`.

### Admin

- **Approve member** on a pending automated profile report clears `under_review_at` ([`POST /api/admin/reports/approve-member`](../src/app/api/admin/reports/approve-member/route.ts)).
- **Suspend / unsuspend** on the members page blocks or unblocks IPs from that member’s stored signup signal ([`PATCH /api/admin/members`](../src/app/api/admin/members/route.ts)).

## Signals we do not use

Gmail, OAuth provider, Chrome user agent, onboarding speed, and photo count are not used for repeat detection. Shared carrier IPs can block innocent users on the same network until an admin unsuspends the member who contributed the IP.
