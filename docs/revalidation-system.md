# Revalidation System Documentation

## Overview

This project uses Next.js's **`use cache` directive** with **tag-based revalidation** for granular, component-level caching. This approach provides:

- **Component-level caching**: Individual data fetches are cached independently
- **Granular invalidation**: Only affected data is refreshed, not entire pages
- **Stale-while-revalidate**: Users see cached content while fresh data loads

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Cached Data Layer                           │
│                        (src/lib/data/*.ts)                          │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  events.ts      │  │  albums.ts      │  │  profiles.ts    │     │
│  │  - getRecent... │  │  - getRecent... │  │  - getOrganiz...│     │
│  │  - getUpcoming..│  │  - getPublic... │  │  - getRecent... │     │
│  │  - getPast...   │  │  - getUserPub...│  │  - getProfile...│     │
│  │  - getAttend... │  │                 │  │  - getStats...  │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │               │
│           ▼                    ▼                    ▼               │
│  Tags: events,         Tags: albums,        Tags: profiles,         │
│        event-attendees       profile-[nick]       profile-[nick]    │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Revalidation Actions                            │
│                  (src/app/actions/revalidate.ts)                    │
│                                                                     │
│  revalidateTag('events', 'max')        → Invalidates event cache    │
│  revalidateTag('event-attendees'...)   → Invalidates RSVP data      │
│  revalidateTag('albums', 'max')        → Invalidates album cache    │
│  revalidateTag('profiles', 'max')      → Invalidates profiles cache │
│  revalidateTag('profile-nick', 'max')  → Invalidates specific user  │
└─────────────────────────────────────────────────────────────────────┘
```

## Cache Tags

| Tag | Description | Invalidated When |
|-----|-------------|------------------|
| `events` | All event data (upcoming, past, details) | Event created/updated/deleted |
| `event-attendees` | RSVP and attendee lists | RSVP signup/confirm/cancel |
| `albums` | All album listings | Album created/updated/deleted |
| `profiles` | Members list, organizers | New user onboarding, profile changes |
| `profile-[nickname]` | Specific user's data | User updates profile, creates content |

## Configuration

Enable component-level caching in `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  cacheComponents: true,
  // ...
};
```

## Implementation

### 1. Cached Data Layer (`src/lib/data/`)

Create cached data functions using `use cache` and `cacheTag`:

```typescript
// src/lib/data/events.ts
import { cacheTag } from 'next/cache';

export async function getRecentEvents(limit = 6) {
  'use cache';
  cacheTag('events');

  const supabase = createPublicClient();
  const { data } = await supabase
    .from('events')
    .select('...')
    .limit(limit);

  return data || [];
}
```

### 2. Revalidation Actions (`src/app/actions/revalidate.ts`)

Call `revalidateTag` when data changes:

```typescript
'use server';
import { revalidateTag } from 'next/cache';

export async function revalidateEvents() {
  revalidateTag('events', 'max');
}

export async function revalidateEventAttendees() {
  revalidateTag('event-attendees', 'max');
}
```

### 3. Using Cached Data in Pages

Import and use cached functions in your pages:

```typescript
// src/app/page.tsx
import { getRecentEvents } from '@/lib/data/events';
import { getRecentAlbums } from '@/lib/data/albums';
import { getOrganizers, getRecentMembers } from '@/lib/data/profiles';

export default async function Home() {
  const [events, albums, organizers, members] = await Promise.all([
    getRecentEvents(6),
    getRecentAlbums(6),
    getOrganizers(5),
    getRecentMembers(12),
  ]);

  return (
    // Render with cached data
  );
}
```

### 4. Triggering Revalidation

Call revalidation functions after data mutations:

```typescript
// In API route or Server Action
import { revalidateEventAttendees } from '@/app/actions/revalidate';

export async function POST(request: NextRequest) {
  // ... create RSVP ...
  
  // Revalidate attendee cache
  await revalidateEventAttendees();
  
  return NextResponse.json({ success: true });
}
```

## Available Functions

### Event Functions (`src/lib/data/events.ts`)

| Function | Tags | Description |
|----------|------|-------------|
| `getRecentEvents(limit)` | `events` | Recent events for homepage |
| `getUpcomingEvents()` | `events` | All upcoming events |
| `getPastEvents(limit)` | `events` | Paginated past events |
| `getEventAttendees(ids)` | `event-attendees` | Attendees for specific events |

### Album Functions (`src/lib/data/albums.ts`)

| Function | Tags | Description |
|----------|------|-------------|
| `getRecentAlbums(limit)` | `albums` | Recent public albums |
| `getPublicAlbums(limit)` | `albums` | All public albums |
| `getUserPublicAlbums(...)` | `albums`, `profile-[nick]` | User's public albums |

### Profile Functions (`src/lib/data/profiles.ts`)

| Function | Tags | Description |
|----------|------|-------------|
| `getOrganizers(limit)` | `profiles` | Admin/organizer list |
| `getRecentMembers(limit)` | `profiles` | Recent members |
| `getProfileByNickname(nick)` | `profiles`, `profile-[nick]` | Specific user profile |
| `getUserPublicPhotos(...)` | `profile-[nick]` | User's public photos |
| `getProfileStats(...)` | `profile-[nick]` | User's stats |

### Revalidation Functions (`src/app/actions/revalidate.ts`)

| Function | Invalidates | Use When |
|----------|-------------|----------|
| `revalidateEvents()` | `events` | Event CRUD |
| `revalidateEventAttendees()` | `event-attendees` | RSVP changes |
| `revalidateAlbum(nick, slug)` | `albums`, `profile-[nick]` | Album update |
| `revalidateAlbums(nick, slugs)` | `albums`, `profile-[nick]` | Bulk album ops |
| `revalidateProfile(nick)` | `profiles`, `profile-[nick]` | Profile update |
| `revalidateProfiles()` | `profiles` | Member list changes |
| `revalidateAll()` | All tags | Admin operations |

## Adding New Cached Data

### Step 1: Create Data Function

```typescript
// src/lib/data/yourEntity.ts
import { cacheTag } from 'next/cache';
import { createPublicClient } from '@/utils/supabase/server';

export async function getYourData() {
  'use cache';
  cacheTag('your-tag');

  const supabase = createPublicClient();
  const { data } = await supabase.from('your_table').select('...');
  return data;
}
```

### Step 2: Export from Index

```typescript
// src/lib/data/index.ts
export * from './yourEntity';
```

### Step 3: Add Revalidation Function

```typescript
// src/app/actions/revalidate.ts
export async function revalidateYourEntity() {
  revalidateTag('your-tag', 'max');
}
```

### Step 4: Use in Pages

```typescript
// src/app/your-page/page.tsx
import { getYourData } from '@/lib/data';

export default async function YourPage() {
  const data = await getYourData();
  return <YourComponent data={data} />;
}
```

### Step 5: Trigger Revalidation

```typescript
// In mutation (API route, Server Action, hook)
import { revalidateYourEntity } from '@/app/actions/revalidate';

// After data change
await revalidateYourEntity();
```

## Benefits Over Path-Based Revalidation

| Aspect | Path-Based (`revalidatePath`) | Tag-Based (`revalidateTag`) |
|--------|-------------------------------|----------------------------|
| Granularity | Entire page | Specific data segments |
| Cache efficiency | All page data refetched | Only tagged data refetched |
| Component reuse | Same data cached per-page | Same data shared across pages |
| Complexity | Simple | Moderate (requires data layer) |

## Best Practices

1. **One tag per data type**: Use broad tags like `events`, `albums`
2. **Specific user tags**: Use `profile-[nickname]` for user-specific data
3. **Separate attendees from events**: RSVP changes happen frequently
4. **Use 'max' profile**: Enables stale-while-revalidate behavior
5. **Batch parallel fetches**: Use `Promise.all()` for multiple data sources

## Troubleshooting

### Data not updating after mutation?
- Ensure you're calling the correct revalidation function
- Check that the tag matches between data function and revalidation
- Verify the 'max' profile is being used

### Stale data on first load?
- The 'max' profile serves stale content while revalidating
- This is expected behavior for better UX

### Cache not working at all?
- Ensure `cacheComponents: true` is in `next.config.ts`
- Verify `'use cache'` directive is at the top of the function
- Check that `cacheTag()` is called within the cached function

### "Math.random() inside a Client Component without Suspense" error
- Client components using `Math.random()` must be wrapped in `<Suspense>`
- Use `useState` with a lazy initializer (not `useEffect`) to avoid cascading renders
- Add `suppressHydrationWarning` to handle SSR/client mismatch

### "new Date() before accessing uncached data" error
- Similar to `Math.random()`, `new Date()` has restrictions with Cache Components
- Options:
  1. Move date operations to client components
  2. Use the `connection()` function from `next/server` to opt into dynamic rendering
  3. Access cached data before using `new Date()`

### "Uncached data outside Suspense" error for dynamic routes
- Dynamic routes (e.g., `[slug]`) require `generateStaticParams` when using Cache Components
- Must return at least one sample path for build-time validation
- Add `loading.tsx` for automatic Suspense boundary

## Handling Date and Random Values

With Cache Components enabled, Next.js enforces strict rules about `new Date()` and `Math.random()`.

### Solutions Implemented

| Component | Issue | Solution |
|-----------|-------|----------|
| `Footer` | `new Date().getFullYear()` | Client component with `useState` + `useEffect` |
| `RandomHeroImage` | `Math.random()` | `useState` lazy initializer + Suspense boundary + `onLoad` fade-in |
| `ActivitiesSlider` | Swiper library uses Date | Wrapped in `ActivitiesSliderWrapper` with dynamic import `ssr: false` |
| `EventCard` | `isEventPast()` | Accepts `serverNow` prop from data layer |
| `RecentEventsList` | Sorting by date | Requires `serverNow` prop |
| `EventsList` | `isEventPast()` | Requires `serverNow` prop |
| `PastEventsPaginated` | Client-side date | Uses `useState` + `useEffect` for `clientNow` |
| Album page | Dynamic route params | `generateStaticParams` + `loading.tsx` |

### The `serverNow` Pattern

For server components that need current time, pass a timestamp from the cached data layer:

```typescript
// In data layer (src/lib/data/events.ts)
export async function getRecentEvents(limit = 6) {
  'use cache';
  cacheTag('events');

  const supabase = createPublicClient();
  const { data } = await supabase.from('events')...;

  return {
    events: (data || []) as CPGEvent[],
    serverNow: Date.now(),  // Safe inside 'use cache'
  };
}

// In page component
const { events, serverNow } = await getRecentEvents(6);

// Pass to components
<RecentEventsList events={events} serverNow={serverNow} />
```

### Client Component Pattern for Random Values

For client components needing `Math.random()`, use `useState` with lazy initializer and wrap in Suspense:

```typescript
// RandomHeroImage.tsx
'use client';
import { useState } from 'react';

const images = ['/img1.jpg', '/img2.jpg', '/img3.jpg'];

export default function RandomHeroImage() {
  // Lazy initializer runs once on mount
  const [image] = useState(
    () => images[Math.floor(Math.random() * images.length)],
  );
  
  // Track load state for fade-in animation
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Image
      src={image}
      className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      onLoad={() => setIsLoaded(true)}
      suppressHydrationWarning
    />
  );
}

// page.tsx - Must wrap in Suspense
import { Suspense } from 'react';
import RandomHeroImage from './RandomHeroImage';

export default function Page() {
  return (
    <Suspense fallback={<div className="bg-gray-200" />}>
      <RandomHeroImage />
    </Suspense>
  );
}
```

### Client Component Pattern for Date Values

For client components needing current date, use `useState` + `useEffect`:

```typescript
'use client';
import { useState, useEffect } from 'react';

export default function Footer() {
  const [year, setYear] = useState(2024); // Static default for SSR

  useEffect(() => {
    // Defer to avoid sync setState in effect
    const frame = requestAnimationFrame(() => {
      setYear(new Date().getFullYear());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return <p>© {year} My Company</p>;
}
```

### Dynamic Route Pattern

Dynamic routes with Cache Components require `generateStaticParams` and `loading.tsx`:

```typescript
// src/app/[nickname]/album/[albumSlug]/page.tsx

// Required: Return at least one sample path for build-time validation
export async function generateStaticParams() {
  return [{ nickname: 'sample', albumSlug: 'sample' }];
}

export async function generateMetadata({ params }) {
  const { nickname, albumSlug } = await params;
  const album = await getAlbumBySlug(nickname, albumSlug);
  return { title: album?.title || 'Not Found' };
}

export default async function Page({ params }) {
  const { nickname, albumSlug } = await params;
  return <AlbumContent nickname={nickname} albumSlug={albumSlug} />;
}
```

```typescript
// src/app/[nickname]/album/[albumSlug]/loading.tsx
import AlbumSkeleton from './AlbumSkeleton';

export default function Loading() {
  return <AlbumSkeleton />;
}
```

### Third-Party Library Pattern

For libraries that internally use Date (e.g., Swiper), use dynamic import with `ssr: false` in a wrapper client component:

```typescript
// ActivitiesSliderWrapper.tsx
'use client';
import dynamic from 'next/dynamic';

const ActivitiesSlider = dynamic(
  () => import('./ActivitiesSlider'),
  { ssr: false }
);

export default function ActivitiesSliderWrapper() {
  return <ActivitiesSlider />;
}
```

Then use the wrapper in server components:

```typescript
// page.tsx (Server Component)
import ActivitiesSliderWrapper from '@/components/shared/ActivitiesSliderWrapper';

export default function Page() {
  return <ActivitiesSliderWrapper />;
}
```
