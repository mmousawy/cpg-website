# Files Changed - View counter reliability, challenge submission UX, mini card cleanup

## Overview

Several fixes to the view tracking system to ensure counts display correctly and aren't inflated. The view counter was showing stale cached numbers on page load and not re-tracking after client-side navigations. Additionally, challenge submission cards now link to the photo detail page, and the mini card components were cleaned up to use clsx.

## View Tracking Fixes

### Problem: Stale view counts from cache

ViewTracker was rendered inside `'use cache'` components with `cacheLife('max')`, so the `initialCount` prop was always the value from when the cache was last built. The component would briefly flash the stale count before the API responded with the real number.

**Fix:** ViewTracker no longer accepts `initialCount`. It shows just the eye icon on render, then displays the fresh count once the API responds. No more stale flash.

### Problem: Views not tracked on client-side navigation

`useViewTracker` used a boolean ref that was set once and never reset. When React reused the component instance during client-side navigation (common with Next.js App Router), the ref stayed `true` and views were never tracked again.

**Fix:** Added `usePathname()` as an effect dependency. When the pathname changes (navigating away and back), the effect cleanup resets the tracking guard and the effect re-fires. The track key now includes the pathname to prevent double-tracking within the same visit.

### Self-view prevention

The POST endpoint now checks if the logged-in user owns the entity being viewed. If so, it skips the increment and returns the current count.

### Development mode

In development, the hook now calls a GET endpoint instead of POST, fetching the current count without incrementing. This prevents local testing from inflating production-like view counts.

- `src/hooks/useViewTracker.ts` — Removed `initialCount` param, state starts as `null`, added pathname dependency, dev mode uses GET
- `src/components/shared/ViewTracker.tsx` — Renders eye icon + fresh count directly (no longer delegates to ViewCount), removed `initialCount` prop
- `src/components/photo/PhotoPageContent.tsx` — Removed `initialCount` prop from ViewTracker
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx` — Removed `initialCount` prop from ViewTracker
- `src/app/api/views/route.ts` — Added GET handler for read-only count fetch, added self-view check in POST

## Challenge Submissions

### Clickable photo on submission cards

The submitted photo thumbnail on the My Challenges page now links to the photo detail page. Uses an overlay `<Link>` with `absolute inset-0 z-10` since the `BlurImage` uses `fill` positioning.

### Query fixes

Both `fetchMySubmissionsForChallenge` and `fetchAllMySubmissions` were missing data needed for the photo link:
- `short_id` wasn't selected in the photo join (for `fetchAllMySubmissions`)
- User profile wasn't joined at all — added `user:profiles!challenge_submissions_user_id_fkey` join

### UI improvements

- Added `check-circle-filled.svg` (Heroicon solid) next to submission date
- Deadline now shows "Ended on Jan 5, 2026" instead of just "Ended"
- Moved deadline badge from image overlay to content area for better readability

- `src/app/account/challenges/page.tsx` — Photo link, icon, deadline format, layout tweaks
- `src/hooks/useChallengeSubmissions.ts` — Added `short_id` and user profile to both queries
- `public/icons/check-circle-filled.svg` — New Heroicon solid check-circle

## Mini Card Cleanup

Replaced template literal string concatenation with `clsx` in both mini card components for cleaner conditional class handling.

- `src/components/album/AlbumMiniCard.tsx` — clsx, adjusted spacing
- `src/components/challenges/ChallengeMiniCard.tsx` — clsx, adjusted spacing

## Other

- `src/components/manage/PhotoListItem.tsx` — `getPhotoDisplayName` now returns just the title instead of `title (short_id)`

## All Modified Files (11 total)

New:
- `public/icons/check-circle-filled.svg`

Modified:
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx`
- `src/app/account/challenges/page.tsx`
- `src/app/api/views/route.ts`
- `src/components/album/AlbumMiniCard.tsx`
- `src/components/challenges/ChallengeMiniCard.tsx`
- `src/components/manage/PhotoListItem.tsx`
- `src/components/photo/PhotoPageContent.tsx`
- `src/components/shared/ViewTracker.tsx`
- `src/hooks/useChallengeSubmissions.ts`
- `src/hooks/useViewTracker.ts`
