# Files Changed - Hold new profiles for review and block repeat spam signups

## Overview

New members used to go public as soon as onboarding finished. Spam and ad accounts could then like, comment, and open a public profile before anyone looked at them. Onboarding now classifies the profile in one write: publish, hold under review, or suspend. Held members can browse but cannot interact. Suspended members (and later signups from the same IP) hit a chromeless blocked screen.

## Why onboarding was not enough

Link checks already ran on profile URLs, but an inconclusive fetch still published the page. Repeat signups also came back with a new nickname after a suspension. Public data reads did not hide held profiles, so `/@nickname` could 404 or leak depending on column grants.

## Onboarding outcomes

`POST /api/onboarding/complete` runs URL checks plus `assessOnboardingModeration`, then writes `under_review_at` or `suspended_at` in the same update.

| Outcome | When | Member experience |
|--------|------|-------------------|
| Publish | No advertising signal, no inconclusive URL | Public profile; admins get member-joined notification |
| Under review | A checked URL was inconclusive | Signed in; browse only; `/account` and own `/@nickname` redirect to `/under-review` |
| Suspend | Clear ads, unsafe URL, or overlap with a suspended member | Signed out; IP added to `blocked_ips` |

Existing members who later save a bad link still get link hiding and a report. They are not auto-suspended.

Display name and bio use the same service-offer patterns as page titles (`isServiceOfferText`). Hosts already used on a **suspended** profile count as advertising (`suspendedLinkHosts.ts`).

## Under-review lock

Held members keep header and footer. The under-review page is a centered logo plus copy. Proxy redirects `/account` and the member's public profile to `/under-review`. Mutating `/api/*` returns 403 except auth, contact, views, unsubscribe, notifications, onboarding revalidate, and feedback (`isUnderReviewWriteBlocked`).

`useCanInteract` reads `profile.under_review_at` (and the review-preview cookie) so likes, comments, follows, RSVPs, reports, album joins, challenge submits, scene interest, and similar controls disable in the UI. `toggleLike` also refuses held actors on the server action path.

Public profile queries filter `.is('under_review_at', null)` so held accounts stay off member lists, sitemaps, and public `/@nickname` pages.

## Repeat signup IP blocking

At email signup, OAuth callback, and onboarding complete, `requestClientMeta` stores browser IP, user agent, and `Accept-Language` on `signup_signals`. Rows with UA `node` or a missing IP are skipped (server-side auth sessions).

Onboarding then compares the new account to **suspended** members on:

- Client IP (`blocked_ips` or a suspended member's `signup_signals` row)
- Nickname stem (trailing digits stripped; prefix match when the stem is at least 4 characters)
- Display name (exact, case-insensitive)
- Link host (website, social, or bio URL)

A match suspends with reason `Repeat of a suspended account`. Proxy sends blocked IPs to `/network-blocked` before other routing. That page has no header or footer; contact is email only. Signup and OAuth also refuse blocked IPs.

Admin suspend / unsuspend on the members page adds or removes IPs from that member's stored signal. **Approve member** on a pending automated profile report clears `under_review_at`.

## Local preview

Query params stick in cookies without bypassing a real hold or IP block:

- `?preview-block=true` / `false` — blocked screen
- `?preview-review=true` / `false` — under-review screen and interaction lock

Block preview wins if both are set.

## Schema and types

Baseline now includes `profiles.under_review_at`, `signup_signals`, and `blocked_ips`. `src/database.types.ts` stays generated (`pnpm db:types` / `pnpm db:sync`). `get_own_profile` and `ServerProfile` expose `under_review_at` so session and proxy can gate without extra queries.

## All Modified Files

New:

- `changelog/2026-11-06/sha.txt`
- `changelog/2026-11-06/commit-message.txt`
- `changelog/2026-11-06/files-changed.md`
- `docs/member-review.md`
- `src/app/api/admin/reports/approve-member/route.ts`
- `src/app/api/onboarding/complete/route.ts`
- `src/app/network-blocked/layout.tsx`
- `src/app/network-blocked/page.tsx`
- `src/app/under-review/page.tsx`
- `src/components/account/UnderReviewSignOut.tsx`
- `src/components/memberReview/ModerationPreviewNotice.tsx`
- `src/hooks/useCanInteract.ts`
- `src/lib/memberReview/assessOnboardingModeration.test.ts`
- `src/lib/memberReview/assessOnboardingModeration.ts`
- `src/lib/memberReview/blockPreview.test.ts`
- `src/lib/memberReview/blockPreview.ts`
- `src/lib/memberReview/ipBlocking.ts`
- `src/lib/memberReview/nicknameStem.test.ts`
- `src/lib/memberReview/nicknameStem.ts`
- `src/lib/memberReview/requestClientMeta.ts`
- `src/lib/memberReview/underReviewGate.test.ts`
- `src/lib/memberReview/underReviewGate.ts`
- `src/lib/profileUrl/suspendedLinkHosts.ts`
- `src/utils/networkBlockedPath.ts`

Modified:

- `README.md`
- `docs/README.md`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `scripts/postprocess-database-types.mjs`
- `src/app/admin/reports/page.tsx`
- `src/app/api/admin/members/route.ts`
- `src/app/api/auth/signup/route.ts`
- `src/app/api/onboarding/notify/route.ts`
- `src/app/auth-callback/route.ts`
- `src/app/globals.css`
- `src/app/onboarding/OnboardingClient.tsx`
- `src/app/sitemap.ts`
- `src/components/albums/JoinAlbumButton.tsx`
- `src/components/albums/SubmitToSharedAlbumButton.tsx`
- `src/components/challenges/ColorDraw/ColorDrawClient.tsx`
- `src/components/challenges/SubmitButton.tsx`
- `src/components/events/EventRsvpStatus.tsx`
- `src/components/events/EventSignupBar.tsx`
- `src/components/layout/DocumentRouteState.tsx`
- `src/components/layout/MobileTabBar.tsx`
- `src/components/layout/OnboardingAwareChrome.tsx`
- `src/components/profile/FollowButton.tsx`
- `src/components/scene/AddSceneEventButton.tsx`
- `src/components/scene/SceneActionsMenu.tsx`
- `src/components/scene/SceneActionsPopover.tsx`
- `src/components/scene/SceneEventInterestSection.tsx`
- `src/components/scene/SceneEventStickyBar.tsx`
- `src/components/shared/AlbumActionsMenu.tsx`
- `src/components/shared/AlbumActionsPopover.tsx`
- `src/components/shared/CommentActionsPopover.tsx`
- `src/components/shared/Comments.tsx`
- `src/components/shared/DetailLikesSection.tsx`
- `src/components/shared/PhotoActionsMenu.tsx`
- `src/components/shared/PhotoActionsPopover.tsx`
- `src/components/shared/ProfileActionsMenu.tsx`
- `src/components/shared/ProfileActionsPopover.tsx`
- `src/components/shared/ReportButton.tsx`
- `src/content/help/account.tsx`
- `src/context/authSessionRuntime.ts`
- `src/database.types.ts`
- `src/hooks/useReports.ts`
- `src/lib/actions/likes.ts`
- `src/lib/data/albums.ts`
- `src/lib/data/challenges.ts`
- `src/lib/data/gear.ts`
- `src/lib/data/interests.ts`
- `src/lib/data/members.ts`
- `src/lib/data/profiles.ts`
- `src/lib/profileTours.test.ts`
- `src/lib/profileUrl/classifyPageContent.ts`
- `src/proxy.ts`
- `src/utils/proxyAuth.ts`
- `src/utils/supabase/getServerAuth.ts`
- `supabase/migrations/00000000000000_baseline.sql`
