# Files Changed - Mobile UI Optimizations and Challenge Badges

## Overview

This update focuses on two main areas: improving mobile layouts to maximize content space, and adding challenge badges to photos so users can see which photos have been accepted in challenges.

The mobile improvements reduce horizontal padding accumulation (PageContainer + Container + Card padding was eating up ~23% of screen width). Event cards are now borderless on mobile with dividers, giving them more breathing room.

The challenge badge feature adds a purple star icon to photos in the manage grid and shows challenge info in photo detail pages, similar to how albums are displayed.

## Mobile UI Improvements

### Reduced Padding

The main issue was padding accumulation across nested containers:
- PageContainer: 16px
- Container: 16px  
- Card padding: 12px
- Total: 44px per side (88px total on a 375px screen)

Changes:
- `PageContainer`: Reduced mobile padding from `px-4` to `px-2`
- Grid gaps tightened for challenges (`gap-5` → `gap-2 sm:gap-5`) and albums

### Borderless Event Cards on Mobile

Event cards on mobile now use a list-style layout instead of bordered cards:
- Removed border, background, and rounded corners on mobile
- Added dividers between items using `divide-y`
- Cards still have full styling on desktop

```tsx
// EventCard wrapper classes
'block transition-colors group',
'sm:rounded-lg sm:border sm:border-border-color sm:bg-background',
'py-4 sm:p-4',
```

```tsx
// EventsList container
'divide-y divide-border-color sm:divide-y-0 sm:space-y-3'
```

### Smaller Border Radius

Cards have smaller border radius on mobile for a tighter look:
- `ChallengeCard`: `rounded-2xl` → `rounded-xl sm:rounded-2xl`
- `AlbumCard`: Added `rounded-lg sm:rounded-xl`

## Challenge Badges for Photos

### New ChallengeMiniCard Component

Similar to `AlbumMiniCard`, this displays a challenge with its cover image and title. Has an optional `showStatus` prop (default false) to show Accepted/Pending/Rejected status.

### PhotoCard Badge

Photos accepted in challenges now show a purple star badge in the manage grid:

```tsx
if (isInAcceptedChallenge && !accepted && !pending && !rejected) {
  badgeList.push({
    icon: <AwardStarMiniSVG className="size-4 fill-current" />,
    variant: 'challenge' as const,
    tooltip: `Accepted in: ${acceptedChallengeNames}`,
  });
}
```

The badge only shows when not in a challenge submission context (to avoid duplicate badges).

### Data Layer Changes

Both `getPhotoByShortId` and `getAlbumPhotoByShortId` now fetch accepted challenge submissions:

```tsx
const { data: challengeSubmissions } = await supabase
  .from('challenge_submissions')
  .select('challenge_id, challenges(id, title, slug, cover_image_url)')
  .eq('photo_id', photo.id)
  .eq('status', 'accepted');
```

The `usePhotos` hook also fetches challenge data for the manage grid.

### UI Integration

- `SinglePhotoEditForm`: Shows "In challenges:" section below "In albums:"
- `PhotoPageContent`: Shows "Featured in" section above "Seen in" albums

## Notification Positioning

### Toast Positioning

Sonner toasts now respect the header's `max-w-screen-md` constraint:

```tsx
const containerStyle = isFullWidth
  ? { right: '0.5rem' }
  : { right: 'max(0.5rem, calc((100vw - 768px) / 2 + 0.5rem))' };
```

On full-width pages (like `/account/photos`), toasts align with the viewport edge. On constrained pages, they align with the content area.

### StickyActionBar

Padding updated to match PageContainer:
- Mobile: `px-4 py-3`
- Desktop: `md:px-12 md:py-4`

## Type Changes

Added `PhotoChallengeInfo` type and `challenges` array to `PhotoWithAlbums`:

```tsx
export type PhotoChallengeInfo = {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string | null;
  status: 'accepted' | 'pending' | 'rejected';
};

export type PhotoWithAlbums = Photo & {
  albums?: PhotoAlbumInfo[];
  challenges?: PhotoChallengeInfo[];
  // ...
};
```

## All Modified Files

New:
- `src/components/challenges/ChallengeMiniCard.tsx` - Mini card for displaying challenge info

Modified:
- `src/app/[nickname]/album/[albumSlug]/photo/[photoId]/page.tsx` - Pass challenges to PhotoPageContent
- `src/app/[nickname]/photo/[photoId]/page.tsx` - Pass challenges to PhotoPageContent
- `src/app/events/[eventSlug]/page.tsx` - Cache tag addition
- `src/app/page.tsx` - Tighter album grid on mobile
- `src/components/album/AlbumCard.tsx` - Responsive border radius
- `src/components/challenges/ChallengeCard.tsx` - Smaller size/radius on mobile
- `src/components/challenges/ChallengesList.tsx` - Tighter grid gaps
- `src/components/events/EventCard.tsx` - Borderless on mobile
- `src/components/events/EventsList.tsx` - Dividers instead of spacing on mobile
- `src/components/layout/PageContainer.tsx` - Reduced mobile padding
- `src/components/manage/PhotoCard.tsx` - Challenge badge support
- `src/components/manage/PhotoGrid.tsx` - Minor formatting
- `src/components/manage/SinglePhotoEditForm.tsx` - "In challenges" section
- `src/components/notifications/NotificationButton.tsx` - Full-width path awareness
- `src/components/notifications/ToastProvider.tsx` - Max-width aware positioning
- `src/components/photo/PhotoPageContent.tsx` - "Featured in" challenges section
- `src/components/shared/CardBadges.tsx` - New 'challenge' variant
- `src/components/shared/StickyActionBar.tsx` - Aligned padding
- `src/hooks/usePhotos.ts` - Fetch challenge submissions
- `src/lib/data/profiles.ts` - Fetch challenges for photo detail pages
- `src/types/photos.ts` - PhotoChallengeInfo type
