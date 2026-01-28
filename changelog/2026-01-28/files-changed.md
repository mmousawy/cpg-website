# Files Changed - Blur Image Placeholders, Unified Attendees UI & Image Cleanup

## Overview

Three main improvements in this update:

1. **Blur placeholders for images**: Added a `BlurImage` component that shows instant blurhash-decoded placeholders while full images load, with a fallback to tiny Supabase images for photos without blurhash data.

2. **Unified attendees/likes UI**: Created a reusable `StackedAvatarsPopover` component for displaying stacked avatars with an expandable popover. Refactored `DetailLikesSection` and unified `RecentEventsList` into `EventsList`.

3. **Image cleanup**: Removed the legacy `image_url` column from events, migrated all external event covers to Supabase storage, and adjusted image dimensions for better optimization.

---

## Image Loading: BlurImage Component

### The Problem

Images were loading with a blank space before appearing, which created a jarring experience. Photos in the database have `blurhash` data that could be used for instant placeholders, but it wasn't being utilized.

### The Solution

**File: `src/components/shared/BlurImage.tsx`**

A wrapper around Next.js `Image` that:

1. **Instant blurhash placeholders**: If `blurhash` prop is provided, decodes it client-side to a data URL (no network request)
2. **Supabase fallback**: For images without blurhash, requests a tiny 32px version from Supabase
3. **Cache detection**: Uses `useLayoutEffect` to check if image is already cached, skipping the blur entirely
4. **Smooth fade-in**: Main image fades in over 200ms when loaded

```typescript
// Check if image is already cached before first paint
useLayoutEffect(() => {
  const img = imgRef.current;
  if (img?.complete && img.naturalWidth > 0) {
    setIsCached(true);
    setIsLoaded(true);
  }
}, [srcString]);
```

### Blurhash Decoding

**File: `src/utils/decodeBlurhash.ts`**

Decodes blurhash strings to base64 data URLs using canvas:

```typescript
export function blurhashToDataURL(
  blurhash: string | null | undefined,
  width: number = 32,
  height: number = 32,
): string | null {
  const pixels = decode(blurhash, width, height);
  const canvas = document.createElement('canvas');
  // ... draw pixels to canvas
  return canvas.toDataURL();
}
```

### Supabase Blur URL Helper

**File: `src/utils/supabaseImageLoader.ts`**

Added helper function to get tiny placeholder URLs:

```typescript
export function getBlurPlaceholderUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  const isSupabase = SUPABASE_DOMAINS.some(domain => src.includes(domain));
  if (isSupabase) {
    const url = new URL(src);
    url.searchParams.set('width', '32');
    url.searchParams.set('quality', '20');
    return url.toString();
  }
  return null;
}
```

### Components Updated

BlurImage is now used in:
- `AlbumCard.tsx` - Album cover thumbnails
- `AlbumMiniCard.tsx` - Mini album cards
- `PhotoCard.tsx` - Photo management cards
- `PhotoListItem.tsx` - Photo list items
- `JustifiedPhotoGrid.tsx` - Gallery photo grid (with blurhash)
- `PhotoWithLightbox.tsx` - Full photo view (with blurhash)
- `EventImage.tsx` - Event cover images

---

## Unified Attendees/Likes UI

### StackedAvatarsPopover

**File: `src/components/shared/StackedAvatarsPopover.tsx`**

A reusable component for displaying stacked avatars with an expandable popover:

```typescript
interface StackedAvatarsPopoverProps {
  people: AvatarPerson[];
  singularLabel: string;      // e.g., "attendee"
  pluralLabel: string;        // e.g., "attendees"
  emptyMessage?: string;
  showInlineCount?: boolean;
  disablePopover?: boolean;   // Just show avatars, no interaction
  avatarSize?: keyof typeof SIZE_MAP;
}
```

Features:
- Stacked avatars with max 5 visible, +N indicator for more
- Clickable to expand popover with full list
- Each person links to their profile page
- Loading skeleton state
- Configurable avatar sizes via `avatarSize` prop
- Optional popover disable for simpler display

### DetailLikesSection Refactor

**File: `src/components/shared/DetailLikesSection.tsx`**

Major simplification - now uses `StackedAvatarsPopover` instead of custom implementation:

```typescript
// Before: ~200 lines of custom popover logic
// After: Simple wrapper around StackedAvatarsPopover

<StackedAvatarsPopover
  people={likerPeople}
  singularLabel="like"
  pluralLabel="likes"
  emptyMessage="No likes yet"
/>
```

### EventCard Attendees

**File: `src/components/events/EventCard.tsx`**

Added attendees display to event cards:

```typescript
interface EventCardProps {
  // ...
  attendees?: EventAttendee[];
  disableAttendeesPopover?: boolean;  // For homepage (no popover)
}
```

Attendees show below the event info with stacked avatars. The popover can be disabled for contexts where interaction isn't desired (like the homepage).

### EventsList Unification

**File: `src/components/events/EventsList.tsx`**

Merged `RecentEventsList` functionality into `EventsList` with a `variant` prop:

```typescript
type EventsListVariant = 'full' | 'compact';

interface EventsListProps {
  variant?: EventsListVariant;  // 'full' for /events, 'compact' for homepage
  max?: number;                 // Limit number of events
  disableAttendeesPopover?: boolean;
  avatarSize?: keyof typeof SIZE_MAP;
}
```

- `full` variant: Detailed cards with descriptions, dates, locations, images
- `compact` variant: Smaller cards using `EventCard` component

**File: `src/components/events/RecentEventsList.tsx`** - Deleted (merged into EventsList)

### Avatar SIZE_MAP Export

**File: `src/components/auth/Avatar.tsx`**

Exported `SIZE_MAP` for type-safe size references in other components:

```typescript
export const SIZE_MAP = {
  xxs: 'w-6 h-6 text-[10px]',
  xs: 'w-8 h-8 text-xs',
  sm: 'w-10 h-10 text-xs',
  // ...
};
```

---

## Database: Remove image_url Column

### Migration

**File: `supabase/migrations/20260126000000_remove_events_image_url.sql`**

```sql
-- Remove image_url column from events table
-- All event images should now be in cover_image field
ALTER TABLE events DROP COLUMN IF EXISTS image_url;
```

### Global Search Update

**File: `supabase/migrations/20260125000000_add_global_search.sql`**

Updated to remove `image_url` fallback:

```sql
-- Before: COALESCE(NULLIF(e.cover_image, ''), NULLIF(e.image_url, ''))
-- After: NULLIF(e.cover_image, '')
```

### Migration Scripts

**File: `scripts/migrate-event-covers.ts`**

Script to migrate external event cover images to Supabase storage:
1. Fetches all events with external `image_url` (non-Supabase URLs)
2. Downloads each image
3. Uploads to `event-covers` bucket
4. Updates `cover_image` field with new Supabase URL

**File: `scripts/upload-hero-images.ts`**

Script to upload local hero images to Supabase:
1. Reads images from `public/gallery/`
2. Uploads to `cpg-public/hero/` in Supabase storage
3. Outputs URLs for updating `src/app/page.tsx`

---

## API: Notification Creation

### Event Reminders Cron

**File: `src/app/api/cron/event-reminders/route.ts`**

Added in-app notification creation alongside email reminders:
- Creates notification for RSVP reminders (event is confirmed)
- Creates notification for attendee reminders (event happening soon)
- Both link to the event page

### Event Announcements

**File: `src/app/api/admin/events/announce/route.ts`**

Added notification creation for event announcements:
- Notifies all members when a new event is announced
- Links to the event page

### Email Attendees

**File: `src/app/api/admin/events/email-attendees/route.ts`**

Added notification creation when admin emails attendees:
- Each attendee receives a notification
- Shows the custom message from admin

### Attendee Profiles

**File: `src/app/api/events/past/route.ts`**

Updated to include `full_name` and `nickname` in attendee profiles for the popover:

```typescript
profiles: Pick<Tables<'profiles'>, 'avatar_url' | 'full_name' | 'nickname'>
```

---

## Component Updates

### EventImage Dimensions

**File: `src/components/events/EventImage.tsx`**

Adjusted to 1.5x display size for better quality:
- Small: 960×720 (from 320×240)
- Default: 480×480 (from 640×640)

### HeroImage Sizes

**File: `src/components/shared/HeroImage.tsx`**

Updated `sizes` attribute for better optimization.

### Popover Z-Index

**File: `src/components/shared/Popover.tsx`**

Increased z-index to `z-40` for proper stacking above other elements.

---

## All Modified Files (33 total)

### New Files (6)
- `supabase/migrations/20260126000000_remove_events_image_url.sql` - Drop image_url column
- `src/components/shared/BlurImage.tsx` - Image with blur placeholder
- `src/components/shared/StackedAvatarsPopover.tsx` - Reusable avatars popover
- `src/utils/decodeBlurhash.ts` - Blurhash to data URL decoder
- `scripts/migrate-event-covers.ts` - Migrate external images to Supabase
- `scripts/upload-hero-images.ts` - Upload hero images to Supabase

### Deleted Files (1)
- `src/components/events/RecentEventsList.tsx` - Merged into EventsList

### Modified Files (27)
- `docs/revalidation-system.md` - Updated documentation
- `src/app/admin/events/page.tsx` - Remove image_url references
- `src/app/api/admin/events/announce/route.ts` - Add notification creation
- `src/app/api/admin/events/email-attendees/route.ts` - Add notification creation
- `src/app/api/cron/event-reminders/route.ts` - Add notification creation
- `src/app/api/events/past/route.ts` - Include full profile in attendees
- `src/app/events/[eventSlug]/page.tsx` - Use BlurImage, StackedAvatarsPopover
- `src/app/page.tsx` - Use EventsList with compact variant
- `src/components/album/AlbumCard.tsx` - Use BlurImage
- `src/components/album/AlbumMiniCard.tsx` - Use BlurImage
- `src/components/auth/Avatar.tsx` - Export SIZE_MAP
- `src/components/events/AddToCalendar.tsx` - Minor cleanup
- `src/components/events/EventCard.tsx` - Add attendees with popover
- `src/components/events/EventImage.tsx` - Use BlurImage, adjust dimensions
- `src/components/events/EventsList.tsx` - Add compact variant, attendees
- `src/components/manage/PhotoCard.tsx` - Use BlurImage
- `src/components/manage/PhotoListItem.tsx` - Use BlurImage
- `src/components/photo/JustifiedPhotoGrid.tsx` - Use BlurImage with blurhash
- `src/components/photo/PhotoPageContent.tsx` - Pass blurhash to PhotoWithLightbox
- `src/components/photo/PhotoWithLightbox.tsx` - Use BlurImage with blurhash
- `src/components/shared/DetailLikesSection.tsx` - Use StackedAvatarsPopover
- `src/components/shared/HeroImage.tsx` - Update sizes attribute
- `src/components/shared/Popover.tsx` - Increase z-index
- `src/lib/data/events.ts` - Include attendees in recent events query
- `src/types/events.ts` - Update EventAttendee type
- `src/utils/supabaseImageLoader.ts` - Add getBlurPlaceholderUrl helper
- `supabase/migrations/20260125000000_add_global_search.sql` - Remove image_url fallback
