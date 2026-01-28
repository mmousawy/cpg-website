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
│                              gallery              tag-[tagname]     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Revalidation Actions                            │
│                  (src/app/actions/revalidate.ts)                    │
│                                                                     │
│  revalidateTag('events', 'max')        → Invalidates event cache    │
│  revalidateTag('event-attendees', ..)  → Invalidates RSVP data      │
│  revalidateTag('albums', 'max')        → Invalidates album cache    │
│  revalidateTag('gallery', 'max')       → Invalidates photostream    │
│  revalidateTag('profiles', 'max')      → Invalidates profiles cache │
│  revalidateTag('profile-[nick]', ..)   → Invalidates specific user  │
└─────────────────────────────────────────────────────────────────────┘
```

## Cache Tags

| Tag | Description | Invalidated When |
|-----|-------------|------------------|
| `events` | All event data (upcoming, past, details) | Event created/updated/deleted |
| `event-attendees` | RSVP and attendee lists | RSVP signup/confirm/cancel |
| `albums` | All album listings | Album created/updated/deleted |
| `gallery` | Community photostream, popular tags | Photo created/updated/deleted, tags modified |
| `profiles` | Members list, organizers | New user onboarding, profile changes |
| `profile-[nickname]` | Specific user's data | User updates profile, creates content |
| `tag-[tagname]` | Photos with a specific tag | Photos tagged/untagged |

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

### 3b. Caching Dynamic Route Pages

For dynamic routes (e.g., `/[nickname]`, `/events/[eventSlug]`), add `'use cache'` directly to the page component to cache the entire RSC payload:

```typescript
// src/app/[nickname]/page.tsx
import { cacheLife, cacheTag } from 'next/cache';
import { getProfileByNickname } from '@/lib/data/profiles';

// Required for build-time validation with cacheComponents
export async function generateStaticParams() {
  return [{ nickname: 'sample' }];
}

export default async function ProfilePage({ params }: { params: Promise<{ nickname: string }> }) {
  'use cache';
  
  const resolvedParams = await params;
  const nickname = resolvedParams.nickname;

  // Apply cache settings after extracting params
  cacheLife('max');  // Cache for 30 days stale, 1 year max
  cacheTag('profiles');
  cacheTag(`profile-${nickname}`);

  const profile = await getProfileByNickname(nickname);
  // ...
}
```

**Why this matters:**
- Without page-level `'use cache'`, even if data functions are cached, the RSC payload is regenerated every ~5 minutes
- With page-level caching, the entire rendered component tree is cached
- `generateStaticParams` is required for build-time validation when using `cacheComponents: true`

**Cache durations with `cacheLife('max')`:**
- Stale time: 30 days (served from cache, revalidates in background after this)
- Max age: 1 year (hard expiry)
- Manual invalidation: Call `revalidateTag('profile-nickname')` anytime

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
| `getEventBySlug(slug)` | `events` | Single event by slug |
| `getEventAttendeesForEvent(id)` | `event-attendees` | Attendees for one event |
| `getEventAttendees(ids)` | `event-attendees` | Attendees for multiple events |

### Album Functions (`src/lib/data/albums.ts`)

| Function | Tags | Description |
|----------|------|-------------|
| `getRecentAlbums(limit)` | `albums` | Recent public albums |
| `getPublicAlbums(limit)` | `albums` | All public albums |
| `getAlbumBySlug(nick, slug)` | `albums`, `profile-[nick]` | Single album by slug |
| `getPhotosByUrls(urls)` | `albums` | Photo metadata by URLs |
| `getUserPublicAlbums(...)` | `albums`, `profile-[nick]` | User's public albums |

### Profile Functions (`src/lib/data/profiles.ts`)

| Function | Tags | Description |
|----------|------|-------------|
| `getOrganizers(limit)` | `profiles` | Admin/organizer list |
| `getRecentMembers(limit)` | `profiles` | Recent members |
| `getProfileByNickname(nick)` | `profiles`, `profile-[nick]` | Specific user profile |
| `getUserPublicPhotos(...)` | `profile-[nick]` | User's public photos |
| `getUserPublicPhotoCount(...)` | `profile-[nick]` | User's photo count |
| `getProfileStats(...)` | `profile-[nick]` | User's stats |
| `getPhotoByShortId(nick, id)` | `profile-[nick]` | Single photo by short_id |
| `getAlbumPhotoByShortId(...)` | `profile-[nick]`, `albums` | Photo in album context |

### Gallery Functions (`src/lib/data/gallery.ts`)

| Function | Tags | Description |
|----------|------|-------------|
| `getPublicPhotostream(limit)` | `gallery` | Community photo stream |
| `getPopularTags(limit)` | `gallery` | Popular tags by usage count |
| `getPhotosByTag(tag, limit)` | `gallery`, `tag-[tagname]` | Photos with specific tag |
| `getAllTagNames()` | None (build-time only) | Tag names for static generation |

> **Cache Duration**: All functions use `cacheLife('max')` - data is cached indefinitely until invalidated via `revalidateTag()`.

### Revalidation Functions (`src/app/actions/revalidate.ts`)

| Function | Invalidates | Use When |
|----------|-------------|----------|
| `revalidateEvents()` | `events` | Event CRUD |
| `revalidateEventAttendees()` | `event-attendees` | RSVP changes |
| `revalidateAlbum(nick, slug)` | `albums`, `profile-[nick]`, `gallery` | Album update |
| `revalidateAlbums(nick, slugs)` | `albums`, `profile-[nick]`, `gallery` | Bulk album ops |
| `revalidateGalleryData()` | `gallery` | Photo CRUD |
| `revalidateTagPhotos(tagName)` | `gallery`, `tag-[tagname]` | Photo tagged/untagged |
| `revalidateProfile(nick)` | `profiles`, `profile-[nick]` | Profile update |
| `revalidateProfiles()` | `profiles` | Member list changes |
| `revalidateAll()` | All tags | Admin operations |

## Adding New Cached Data

### Step 1: Create Data Function

```typescript
// src/lib/data/yourEntity.ts
import { cacheTag, cacheLife } from 'next/cache';
import { createPublicClient } from '@/utils/supabase/server';

export async function getYourData() {
  'use cache';
  cacheLife('max'); // Cache forever until tag is invalidated
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
| `Footer` | `new Date().getFullYear()` | Client component - use `new Date()` directly |
| `RandomHeroImage` | `Math.random()` | `useState` lazy initializer + Suspense boundary + `onLoad` fade-in |
| `ActivitiesSlider` | Swiper library uses Date | Wrapped in `ActivitiesSliderWrapper` with dynamic import `ssr: false` |
| `EventCard` | `isEventPast()` | Accepts `serverNow` prop from data layer |
| `EventsList` | `isEventPast()` + sorting | Requires `serverNow` prop (supports `variant="compact"` for homepage) |
| `PastEventsPaginated` | Client-side date | Uses `useState` + `useEffect` for `clientNow` |
| Album page | Dynamic route params | `generateStaticParams` (no `loading.tsx` for cached pages) |

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
const { events, attendeesByEvent, serverNow } = await getRecentEvents(6);

// Pass to components
<EventsList events={events} attendeesByEvent={attendeesByEvent} variant="compact" max={3} serverNow={serverNow} />
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

For client components needing current date, simply use `new Date()` directly:

```typescript
'use client';

export default function Footer() {
  // Safe in client components - runs on client only
  const currentYear = new Date().getFullYear();

  return <p>© {currentYear} My Company</p>;
}
```

Note: Since client components run on the client after hydration, `new Date()` is safe to use directly without `useState`/`useEffect`.

### Dynamic Route Pattern

Dynamic routes with Cache Components require `'use cache'`, `generateStaticParams`, and `loading.tsx`:

```typescript
// src/app/[nickname]/album/[albumSlug]/page.tsx
import { cacheLife, cacheTag } from 'next/cache';

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
  'use cache';  // <-- CRITICAL: Cache the entire RSC payload

  const { nickname, albumSlug } = await params;

  // Apply cache settings after extracting params
  cacheLife('max');
  cacheTag('albums');
  cacheTag(`profile-${nickname}`);

  return <AlbumContent nickname={nickname} albumSlug={albumSlug} />;
}
```

**Why page-level `'use cache'` is essential:**
- Without it, only the data fetches are cached, but the page is still re-rendered on every request
- With it, the entire RSC (React Server Component) payload is cached
- The page will be served instantly from cache until a `revalidateTag()` call invalidates it

**Important:** Do NOT add `loading.tsx` to cached pages. With PPR (Partial Prerender), Next.js will show the loading skeleton during navigation even when content is cached, causing an unnecessary flash. Without `loading.tsx`, cached pages will load instantly.

Only use `loading.tsx` for:
- Truly dynamic pages that always fetch fresh data
- Pages where network latency is expected (e.g., user-specific dashboards with real-time data)

### Authenticated Routes Pattern (Client-Only)

Routes that require authentication (e.g., `/account/*`) should never be cached. Use `unstable_noStore()` in the layout and make all page components client components:

```typescript
// src/app/account/layout.tsx
import { redirect } from 'next/navigation';
import { getServerAuth } from '@/utils/supabase/getServerAuth';
import { unstable_noStore } from 'next/cache';

export default async function AccountLayout({ children }) {
  // Opt out of static generation - account pages require authentication
  unstable_noStore();

  const { user, profile } = await getServerAuth();

  if (!user) {
    redirect('/login?redirectTo=/account');
  }

  return <>{children}</>;
}
```

```typescript
// src/app/account/page.tsx (and all other account pages)
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function AccountPage() {
  const { user, profile } = useAuth(); // Client-side auth hook

  // All data fetching via React Query hooks
  // No server-side caching, fully dynamic
}
```

**Key points for authenticated routes:**
- Layout uses `unstable_noStore()` to opt out of static generation
- All page components use `'use client'` directive
- Data is fetched client-side using React Query hooks
- Auth check in layout redirects unauthenticated users
- `generateStaticParams` is only needed for dynamic route segments (e.g., `[slug]`) to satisfy build-time validation, but the routes are still dynamic at runtime

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
