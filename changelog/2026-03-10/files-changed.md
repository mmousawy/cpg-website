# Files Changed - Self-service account deletion, content cleanup cron, RLS hardening, onboarding & help UX

## Overview

Users can now delete their own accounts from Account → Danger zone. Deletion is a two-phase process: content is hidden immediately and the user is locked out, then after 30 days a weekly cron job permanently removes everything (photos, albums, comments, storage files, auth user). Admins can cancel pending deletions from the members page.

A new weekly cleanup cron also handles soft-deleted content that's been sitting around past the 30-day retention — photos get their storage files cleaned up, albums and comments get hard-deleted.

On the security side, several overly permissive RLS policies were tightened: the `WITH CHECK (true)` INSERT policies on `album_views`, `photo_views`, and `events_rsvps` were either dropped (views go through a SECURITY DEFINER RPC anyway) or replaced with proper authenticated + ownership checks. The photos table's legacy FK to `auth.users` was fixed to point to `profiles` instead.

The onboarding page got a friendlier welcome message and clearer optional/required labeling, and the help page's list styling was standardized so all accordions render `<ul>` elements consistently.

## Self-Service Account Deletion

### The Flow

1. User goes to Account settings → scrolls to "Danger zone" → clicks "Delete my account"
2. Modal shows what will be affected (photo count, album count, etc.) with a mandatory checkbox
3. On confirm, `POST /api/account/delete` sets `deletion_scheduled_at = NOW()` on the profile
4. Confirmation email sent with the permanent deletion date (30 days out) and a link to contact us
5. User is signed out and can no longer log in

### Login Blocking

`src/app/account/layout.tsx` now checks `deletion_scheduled_at` on the profile. If set, signs the user out and redirects to `/account-deleted` — a static page explaining the situation with a link to the contact form.

### Admin Side

The admin members page (`src/app/admin/members/page.tsx`) got several updates:

- Members with pending deletion show an amber "Deletion scheduled" badge with the purge date
- Row background turns amber
- Actions column switches from "Suspend / Delete" to a "Cancel deletion" button
- Admin delete now schedules 30-day deletion (same flow as self-service) instead of immediate removal
- `MemberConfirmDialog` updated with new `cancel-deletion` action type and revised delete messaging

### Confirmation Email

`src/emails/account-deletion.tsx` — React Email template listing:
- Immediate effects (signed out, content hidden)
- 30-day effects (permanent deletion of profile, photos, albums, comments)
- "Changed your mind?" section with contact form link

## Content Cleanup Cron

### `GET /api/cron/cleanup-deleted-content`

Runs every Sunday at 3:00 AM UTC (configured in `vercel.json`). Protected by `CRON_SECRET` bearer token.

Four cleanup phases:

1. **Photos** — Queries photos where `deleted_at < cutoff`. Deletes storage files from `user-photos` bucket in batches of 100, then hard-deletes the DB records.

2. **Albums** — Hard-deletes albums where `deleted_at < cutoff`. FK cascades handle `album_photos`, `album_tags`, `album_likes`, etc.

3. **Comments** — Hard-deletes comments where `deleted_at < cutoff`.

4. **Account purging** — For profiles where `deletion_scheduled_at < cutoff`:
   - Soft-deletes all owned photos (so next cron cycle cleans up storage)
   - Removes contributed `album_photos` from shared albums
   - Nullifies blocking FK references (`challenge_announcements.announced_by`, `challenge_submissions.reviewed_by`, `challenges.created_by`, `event_announcements.announced_by`, `albums.suspended_by`)
   - Deletes avatar files from storage
   - Calls `supabase.auth.admin.deleteUser()` which cascades profile + all related records

Returns a JSON report with counts and any errors.

## Database & Security Changes

### Photos FK Fix

The `photos` table had a legacy constraint `images_uploaded_by_fkey` pointing to `auth.users(id)` with `NO ACTION` — this would block auth user deletion. Replaced with `photos_user_id_fkey` → `profiles(id)` with `ON DELETE SET NULL`.

### Deletion Scheduling Column

Added `deletion_scheduled_at timestamptz` to the `profiles` table.

### RLS Policy Hardening

**album_views & photo_views** — Dropped `"Anyone can track album views"` and `"Anyone can track photo views"` INSERT policies (`WITH CHECK (true)`). All legitimate inserts go through `increment_view_count()` which is `SECURITY DEFINER` and bypasses RLS.

**events_rsvps** — Replaced `"Anyone can create RSVPs"` (`WITH CHECK (true)`) with `"Authenticated users can create RSVPs"`:
- Scoped to `authenticated` role only
- `user_id = auth.uid()` for normal users
- Admins can insert for others (needed for auto-adding hosts on event creation)

## Onboarding UX Improvements

### Welcome Heading

Changed from "Welcome, {email}!" (which would show the full email and overflow the container) to "Welcome to the group, {firstName}!" — the `displayName` fallback chain now ends with empty string instead of `user.email`, so no-name users just see "Welcome to the group!".

### Optional/Required Labels

Non-required fields (profile picture, full name, bio, interests) now show a subtle "(optional)" label using `ml-1.5 text-xs font-normal text-foreground/50`. Required fields (nickname, email for OAuth) keep the red `*` indicator.

### Responsive Tweaks

- Welcome heading: `text-2xl sm:text-3xl` (was fixed `text-3xl`)
- Subtitle: `text-base sm:text-lg` (was fixed `text-lg`)
- Terms checkbox box: `p-2 sm:p-4` (was fixed `p-4`)

## Help Page List Styling

### The Problem

`<ul>` elements inside help accordions had inconsistent styling — some used `ml-6 list-disc`, others used `pl-5 space-y-2 text-foreground/90`, and one had no classes at all.

### The Fix

Added descendant selectors to the `HelpAccordion` content wrapper:

```
[&_ul]:mb-4 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1.5
[&_ol]:mb-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1.5
```

Then stripped all explicit `className` attributes from `<ul>` elements across all help content files (account, challenges, getting-started, licenses, members, photos). Every list now renders identically.

## All Modified Files

New (5):
- `src/app/account-deleted/page.tsx` — Static notice page for blocked users
- `src/app/api/account/delete/route.ts` — Self-service deletion API
- `src/app/api/cron/cleanup-deleted-content/route.ts` — Weekly cleanup cron
- `src/components/account/DeleteAccountSection.tsx` — Danger zone section with modal
- `src/emails/account-deletion.tsx` — Confirmation email template

Modified (40):
- `src/app/account/(manage)/albums/page.tsx` — HelpLink import
- `src/app/account/(manage)/photos/page.tsx` — HelpLink import
- `src/app/account/activity/ActivityContent.tsx` — HelpLink import
- `src/app/account/challenges/page.tsx` — HelpLink import
- `src/app/account/events/page.tsx` — HelpLink import
- `src/app/account/layout.tsx` — Deletion check + redirect logic
- `src/app/account/page.tsx` — DeleteAccountSection wiring
- `src/app/admin/members/page.tsx` — Cancel deletion action + types
- `src/app/api/admin/members/route.ts` — Schedule deletion, cancel deletion, email
- `src/app/challenges/page.tsx` — HelpLink import
- `src/app/events/page.tsx` — HelpLink import
- `src/app/forgot-password/ForgotPasswordClient.tsx` — HelpLink import
- `src/app/gallery/albums/page.tsx` — HelpLink import
- `src/app/gallery/page.tsx` — HelpLink import
- `src/app/gallery/photos/page.tsx` — HelpLink import
- `src/app/login/LoginClient.tsx` — HelpLink import
- `src/app/members/page.tsx` — HelpLink import
- `src/app/onboarding/OnboardingClient.tsx` — Welcome text, displayName fallback, responsive sizing
- `src/app/privacy/page.tsx` — Self-service deletion language
- `src/app/signup/SignupClient.tsx` — HelpLink import
- `src/app/terms/page.tsx` — Two-phase deletion language, updated date
- `src/components/account/CopyrightSettingsSection.tsx` — HelpLink import
- `src/components/admin/MemberConfirmDialog.tsx` — Cancel-deletion action type
- `src/components/admin/MemberTable.tsx` — Deletion badge, cancel button, amber styling
- `src/components/manage/BulkPhotoEditForm.tsx` — HelpLink import
- `src/components/manage/SinglePhotoEditForm.tsx` — HelpLink import
- `src/components/onboarding/OnboardingEmailPreferencesSection.tsx` — Minor cleanup
- `src/components/onboarding/OnboardingInterestsSection.tsx` — Optional label
- `src/components/onboarding/OnboardingProfileSection.tsx` — Optional labels
- `src/components/shared/HelpAccordion.tsx` — Global list styling via descendant selectors
- `src/components/shared/HelpLink.tsx` — Component updates
- `src/content/help/account.tsx` — Delete account FAQ, stripped ul classes
- `src/content/help/challenges.tsx` — Stripped ul classes
- `src/content/help/getting-started.tsx` — Stripped ul classes
- `src/content/help/licenses.tsx` — Stripped ul classes
- `src/content/help/members.tsx` — Stripped ul classes
- `src/content/help/photos.tsx` — Stripped ul classes
- `src/database.types.ts` — deletion_scheduled_at, photos FK relationship
- `supabase/migrations/00000000000000_baseline.sql` — Schema changes applied
- `vercel.json` — Cleanup cron schedule added
