# Files Changed - Cache Revalidation Audit

## Overview

Full audit of the Next.js server-side caching system. The existing setup relied on broad cache tags (e.g., `albums`, `events`) meaning any change to a single album would bust the cache for every album page. This audit introduces granular per-resource tags, fixes several API routes that were mutating data without invalidating any cache, migrates deprecated `unstable_noStore()` calls, and tightens up client-side React Query cache consistency.

42 files touched: 4 new, 38 modified. Zero new ESLint errors. Build passes clean.

## 1. Granular Cache Tags

### Problem

Cache tags were coarse-grained. Liking a single photo invalidated the entire profile cache. Reviewing one challenge submission busted every challenge's photo cache. Editing an album title invalidated every album listing page.

### Solution

Added per-resource tags alongside the existing broad tags, so fine-grained invalidation is possible while bulk operations still work:

| New Tag | Registered In | Invalidated By |
|---------|---------------|----------------|
| `album-[nick]-[slug]` | `getAlbumBySlug()`, `AlbumContent` | `revalidateAlbum()`, `revalidateAlbumBySlug()` |
| `event-[slug]` | `getEventBySlug()`, `CachedEventContent` | `revalidateEventBySlug()` |
| `challenge-[slug]` | `getChallengeBySlug()` | `revalidateChallenge()` |
| `challenge-photos-[id]` | `getChallengePhotos()` | `revalidateChallenge(slug, id)` |
| `photo-[shortId]` | `getPhotoByShortId()`, `getAlbumPhotoByShortId()`, cached photo pages | `revalidatePhoto()`, `revalidatePhotos()` |
| `photo-likes-[photoId]` | — | `revalidatePhotoLikes(photoId, nick)` |
| `album-likes-[albumId]` | — | `revalidateAlbumLikes(albumId, nick)` |
| `notifications-[userId]` | — | notification actions, `createNotification()` |
| `home` | — | `revalidateHome()`, `revalidateAll()` |
| `changelog` | — | `revalidateChangelog()`, `revalidateAll()` |

**Data layer files changed:**
- `src/lib/data/albums.ts` — `getAlbumBySlug` now registers `album-${nickname}-${albumSlug}`
- `src/lib/data/events.ts` — `getEventBySlug` now registers `event-${slug}`
- `src/lib/data/challenges.ts` — `getChallengeBySlug` registers `challenge-${slug}`, `getChallengePhotos` registers `challenge-photos-${challengeId}`
- `src/lib/data/profiles.ts` — `getPhotoByShortId` and `getAlbumPhotoByShortId` register `photo-${photoShortId}`

**Cached server components changed:**
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx` — added `album-${nickname}-${albumSlug}` tag
- `src/app/[nickname]/album/[albumSlug]/photo/[photoId]/page.tsx` — added `photo-${short_id}` tag
- `src/app/[nickname]/photo/[photoId]/page.tsx` — added `photo-${short_id}` tag
- `src/app/events/[eventSlug]/page.tsx` — added `event-${event.slug}` tag

## 2. New & Updated Revalidation Functions

**File: `src/app/actions/revalidate.ts`** (+76 lines)

New functions:

```typescript
revalidateEventBySlug(slug)        // Invalidates event-${slug}
revalidateAlbumBySlug(nick, slug)  // Invalidates album-${nick}-${slug} + profile-${nick}
revalidatePhoto(shortId)           // Invalidates photo-${shortId}
revalidatePhotos(shortIds)         // Batch version of above
revalidateHome()                   // Invalidates home
revalidateChangelog()              // Invalidates changelog
```

Updated signatures:

```typescript
// Before:
revalidatePhotoLikes(ownerNickname)
revalidateAlbumLikes(ownerNickname)
revalidateChallenge(challengeSlug)

// After:
revalidatePhotoLikes(photoId, ownerNickname)   // + photo-likes-${photoId}
revalidateAlbumLikes(albumId, ownerNickname)    // + album-likes-${albumId}
revalidateChallenge(slug, challengeId?)         // + challenge-${slug}, challenge-photos-${id}
```

`revalidateAll()` expanded to also clear `challenges`, `challenge-photos`, `search`, `home`, `changelog`.

## 3. Missing Revalidations Fixed

Several API routes were mutating data but never busting the cache. Users would see stale data until the `cacheLife('max')` TTL expired (30 days).

| Route | Mutation | Added Call |
|-------|----------|-----------|
| `api/auth/signup` | Creates profile | `revalidateProfiles()` |
| `api/admin/challenges/announce` | Sets `announced_at` | `revalidateChallenges()` |
| `api/admin/events/announce` | Sends announcement emails | `revalidateEvents()` |
| `api/admin/mark-attendance` | Updates RSVP `attended` | `revalidateEventAttendees()` |
| `api/admin/members` (DELETE) | Deletes user + profile | `revalidateAll()` |
| `api/comments` | Creates photo/event/challenge comments | `revalidateGalleryData()` |

**Notification cache was completely unwired:**
- `src/lib/actions/notifications.ts` — all 4 actions (`markNotificationAsSeen`, `markAllNotificationsAsSeen`, `markNotificationsSeenByLink`, `dismissNotification`) now call `revalidateTag('notifications-${user.id}', 'max')`
- `src/lib/notifications/create.ts` — `createNotification()` now revalidates `notifications-${params.userId}` after insert

## 4. Admin Album Route Cleanup

Three admin routes were using raw `revalidatePath()` with hardcoded paths. Replaced with centralized tag-based functions:

```typescript
// Before (suspend/unsuspend routes):
revalidatePath(`/@${owner.nickname}/album/${album.slug}`);
revalidatePath(`/@${owner.nickname}`);
revalidatePath('/galleries');

// After:
await revalidateAlbum(owner.nickname, album.slug);
```

```typescript
// Before (delete route):
revalidatePath(`/@${owner.nickname}/album/${album.slug}`);
revalidatePath(`/@${owner.nickname}`);
revalidatePath('/galleries');
revalidatePath('/');

// After:
await revalidateAlbums(owner.nickname);
```

**Files:** `src/app/api/admin/albums/suspend/route.ts`, `unsuspend/route.ts`, `delete/route.ts`

## 5. Likes: Granular Invalidation

Both the API route and server action updated to pass entity IDs:

```typescript
// Before:
await revalidatePhotoLikes(ownerNickname);
await revalidateAlbumLikes(ownerNickname);

// After:
await revalidatePhotoLikes(entityId, ownerNickname);
await revalidateAlbumLikes(entityId, ownerNickname);
```

**Files:** `src/app/api/likes/route.ts`, `src/lib/actions/likes.ts`

## 6. React Query Client-Side Cache Fixes

### Album mutations missing invalidation

`useUpdateAlbum` and `useBulkUpdateAlbums` had optimistic updates but no `onSuccess` invalidation, so stale optimistic data could persist if the server response differed.

**Fix:** Added `queryClient.invalidateQueries({ queryKey: ['albums', userId] })` to both hooks' `onSuccess`.

**File:** `src/hooks/useAlbumMutations.ts`

### Photo reorder missing invalidation

`useReorderPhotos` updated the server but didn't refresh the client cache.

**Fix:** Added `queryClient.invalidateQueries({ queryKey: ['photos', userId, filter] })` in `onSuccess`.

**File:** `src/hooks/usePhotoMutations.ts`

### Photo upload missing profile revalidation

Uploading a public photo didn't refresh the uploader's profile page.

**Fix:** After a successful public upload, fetch the user's nickname and call `revalidateProfile(nickname)`.

**File:** `src/hooks/usePhotoUpload.ts`

### Challenge review missing per-photo invalidation

Accepting/rejecting a challenge submission didn't invalidate the specific photo's cached page, so the "featured in challenge" badge wouldn't appear until TTL expiry.

**Fix:** `useReviewSubmission` and `useBulkReviewSubmissions` now accept `photoShortId`/`photoShortIds`, call `revalidatePhoto()`/`revalidatePhotos()` on success, and invalidate the `['photos']` React Query key so the manage grid updates.

**Files:** `src/hooks/useChallengeSubmissions.ts`, `src/app/admin/challenges/[slug]/submissions/page.tsx`

### Direct Supabase inserts bypassing React Query

`AlbumPicker` and `AddPhotosToAlbumModal` were creating albums via direct `supabase.from('albums').insert()`, completely bypassing React Query's cache. The album list could get out of sync.

**Fix:** Replaced with `createAlbumMutation.mutateAsync()` using the existing `useCreateAlbum` hook. Also replaced manual `isCreatingAlbum` state with `createAlbumMutation.isPending`.

**Files:** `src/components/manage/AlbumPicker.tsx`, `src/components/manage/AddPhotosToAlbumModal.tsx`

## 7. Deprecated API Migration

`unstable_noStore()` from `next/cache` is deprecated in Next.js 16. Replaced with `await connection()` from `next/server`, which does the same thing (opts out of static generation) but is the stable API.

| File | Change |
|------|--------|
| `src/app/account/layout.tsx` | `unstable_noStore()` → `await connection()` |
| `src/app/account/(manage)/layout.tsx` | Same + made function `async` |
| `src/app/cancel/[uuid]/page.tsx` | Same |
| `src/app/confirm/[uuid]/page.tsx` | Same |
| `src/app/admin/layout.tsx` | Added `await connection()` (was missing entirely — admin routes had no static generation opt-out) |

## 8. Build Compatibility: Dynamic Route Layouts

Next.js 16 with Cache Components requires `generateStaticParams` for dynamic route segments to pass build-time prerendering. Four `'use client'` pages under dynamic segments were causing build failures because `usePathname()` in the root `ToastProvider` can't run during static analysis.

**Fix:** Created minimal layout files that export `generateStaticParams` with sample params:

| New File | Sample Param |
|----------|-------------|
| `src/app/admin/challenges/[slug]/layout.tsx` | `{ slug: 'sample-slug' }` |
| `src/app/admin/events/[eventId]/layout.tsx` | `{ eventId: '0' }` |
| `src/app/admin/events/attendance/[eventId]/layout.tsx` | `{ eventId: '0' }` |
| `src/app/unsubscribe/[token]/layout.tsx` | `{ token: 'sample-token' }` |

## 9. Revalidate-All Endpoint

`src/app/api/revalidate-all/route.ts` was missing several tags from the nuclear option. Added `challenges`, `challenge-photos`, `search`, `home`, `changelog` to both the tag list and the response payload.

## 10. Documentation Updates

Both docs updated to reflect all changes:

- **`docs/revalidation-system.md`** — cache tags table expanded from 8 to 22 entries, revalidation functions table expanded with all new functions, cached function tables updated with new granular tags, authenticated routes pattern updated to use `connection()`
- **`docs/revalidation-quick-reference.md`** — cache tags table expanded, "when to revalidate" table expanded, import section updated, troubleshooting updated

## All Modified Files (42 total)

### New Files (4)
- `src/app/admin/challenges/[slug]/layout.tsx` — generateStaticParams for build compatibility
- `src/app/admin/events/[eventId]/layout.tsx` — generateStaticParams for build compatibility
- `src/app/admin/events/attendance/[eventId]/layout.tsx` — generateStaticParams for build compatibility
- `src/app/unsubscribe/[token]/layout.tsx` — generateStaticParams for build compatibility

### Modified Files (38)
- `src/app/actions/revalidate.ts` — new functions, updated signatures, expanded revalidateAll
- `src/app/api/admin/albums/delete/route.ts` — replaced revalidatePath with revalidateAlbums
- `src/app/api/admin/albums/suspend/route.ts` — replaced revalidatePath with revalidateAlbum
- `src/app/api/admin/albums/unsuspend/route.ts` — replaced revalidatePath with revalidateAlbum
- `src/app/api/admin/challenges/announce/route.ts` — added revalidateChallenges call
- `src/app/api/admin/events/announce/route.ts` — added revalidateEvents call
- `src/app/api/admin/mark-attendance/route.ts` — added revalidateEventAttendees call
- `src/app/api/admin/members/route.ts` — added revalidateAll call on user deletion
- `src/app/api/auth/signup/route.ts` — added revalidateProfiles call
- `src/app/api/comments/route.ts` — added revalidateGalleryData for photo/event/challenge comments
- `src/app/api/likes/route.ts` — pass entityId to revalidatePhotoLikes/revalidateAlbumLikes
- `src/app/api/revalidate-all/route.ts` — added 5 missing tags
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx` — added granular album tag
- `src/app/[nickname]/album/[albumSlug]/photo/[photoId]/page.tsx` — added granular photo tag
- `src/app/[nickname]/photo/[photoId]/page.tsx` — added granular photo tag
- `src/app/account/(manage)/layout.tsx` — unstable_noStore → connection()
- `src/app/account/layout.tsx` — unstable_noStore → connection()
- `src/app/admin/challenges/[slug]/page.tsx` — import reordering
- `src/app/admin/challenges/[slug]/submissions/page.tsx` — pass photoShortId(s) to review mutations
- `src/app/admin/layout.tsx` — added connection() opt-out
- `src/app/cancel/[uuid]/page.tsx` — unstable_noStore → connection()
- `src/app/confirm/[uuid]/page.tsx` — unstable_noStore → connection()
- `src/app/events/[eventSlug]/page.tsx` — added granular event tag
- `src/components/manage/AddPhotosToAlbumModal.tsx` — use useCreateAlbum hook instead of direct insert
- `src/components/manage/AlbumPicker.tsx` — use useCreateAlbum hook instead of direct insert
- `src/hooks/useAlbumMutations.ts` — added onSuccess invalidation to update/bulk-update
- `src/hooks/useChallengeSubmissions.ts` — granular photo revalidation on review, photos query invalidation
- `src/hooks/usePhotoMutations.ts` — added onSuccess invalidation to reorder
- `src/hooks/usePhotoUpload.ts` — revalidate uploader's profile after public upload
- `src/lib/actions/likes.ts` — pass entityId to revalidation functions
- `src/lib/actions/notifications.ts` — revalidate notification cache on all actions
- `src/lib/data/albums.ts` — added granular album tag
- `src/lib/data/challenges.ts` — added granular challenge and challenge-photos tags
- `src/lib/data/events.ts` — added granular event tag
- `src/lib/data/profiles.ts` — added granular photo tags
- `src/lib/notifications/create.ts` — revalidate notification cache on creation
- `docs/revalidation-system.md` — expanded tags, functions, patterns, connection() docs
- `docs/revalidation-quick-reference.md` — expanded tags, usage, imports, troubleshooting
