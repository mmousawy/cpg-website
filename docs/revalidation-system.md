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
│  expireTag('events')                   → Invalidates event cache    │
│  expireTag('event-[slug]')             → Invalidates specific event │
│  expireTag('event-attendees')          → Invalidates RSVP data      │
│  expireTag('albums')                   → Invalidates album cache    │
│  expireTag('album-[n]-[s]')            → Invalidates specific album │
│  expireTag('gallery')                  → Invalidates photostream    │
│  expireTag('profiles')                 → Invalidates profiles cache │
│  expireTag('profile-[nick]')             → Invalidates specific user  │
│  expireTag('challenges')               → Invalidates challenges     │
│  expireTag('challenge-[slug]')          → Invalidates one challenge  │
│  expireTag('photo-[id]')               → Invalidates specific photo │
└─────────────────────────────────────────────────────────────────────┘
```

## Cache Tags

| Tag | Description | Invalidated When |
|-----|-------------|------------------|
| `events` | All event data (upcoming, past, details) | Event created/updated/deleted |
| `event-[slug]` | Specific event detail page | Event detail changes |
| `event-attendees` | RSVP and attendee lists | RSVP signup/confirm/cancel |
| `albums` | All album listings | Album created/updated/deleted |
| `album-[nick]-[slug]` | Specific album detail page | Album content changes |
| `gallery` | Community photostream, popular tags | Photo created/updated/deleted, tags modified |
| `profiles` | Members list, organizers | New user onboarding, profile changes |
| `profile-[nickname]` | Specific user's data | User updates profile, creates content |
| `tag-[tagname]` | Photos with a specific tag | Photos tagged/untagged |
| `challenges` | All challenge data | Challenge created/updated/deleted |
| `challenge-[slug]` | Specific challenge detail page | Challenge detail changes |
| `challenge-photos` | Accepted photos in challenges | Submission review |
| `challenge-photos-[id]` | Photos for a specific challenge | Submission review for that challenge |
| `photo-[shortId]` | Specific photo detail page | Photo metadata/challenge status changes |
| `photo-likes-[photoId]` | Like count for a specific photo | Photo liked/unliked |
| `album-likes-[albumId]` | Like count for a specific album | Album liked/unliked |
| `notifications-[userId]` | Notifications for a specific user | Notification created/read/dismissed |
| `search` | Search results | Content changes |
| `home` | Homepage shell (`src/app/page.tsx`) | Event/album/gallery/challenge/profile mutations (see below) |
| `changelog` | Changelog index, details, and detail pages | Changelog filesystem updates |
| `changelog-[slug]` | Specific changelog detail page (`/changelog/[slug]`) | Same as `changelog` |
| `scene` | Scene event listings | Scene CRUD, interest changes |
| `scene-[slug]` | Specific scene event detail page | Scene event updates |
| `challenge-color-draws` | All challenge color draws | Color draw/swap |
| `challenge-color-draws-[id]` | Color draws for one challenge | Color draw/swap for that challenge |
| `event-album-[id]` | Event album photos for one event | Event album photo changes |
| `interests` | All interests data | Interests added/removed |
| `interest-[name]` | Members with a specific interest | Interest membership changes |

## Configuration

Enable component-level caching in `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    // Tag-invalidated content: no client stale window
    tagged: { stale: 0, revalidate: 2592000, expire: 2592000 },
    // Time-sensitive listings (events, challenges, most-viewed gallery)
    hourly: { stale: 0, revalidate: 3600, expire: 86400 },
  },
  experimental: {
    staleTimes: { dynamic: 0, static: 0 },
  },
};
```

Use `cacheLife('tagged')` for tag-invalidated data. Use `cacheLife('hourly')` for events, challenges, and the gallery homepage (most-viewed sections).

> Optional on Vercel: you can use **`'use cache: remote'`** instead of **`'use cache'`** to store entries in Vercel Runtime Cache (shared across instances). That is separate from ISR and may be metered on your plan; this repo uses in-memory **`'use cache'`** only.

## Homepage caching

The homepage (`src/app/page.tsx`) caches its full RSC payload with `cacheTag('home')`. Nested data functions also carry their own tags (`events`, `albums`, `gallery`, `challenges`, `profiles`, etc.), but the page shell only refreshes when the `home` tag is invalidated.

These helpers also invalidate `home` so homepage sections stay in sync:

| Helper | Homepage sections affected |
|--------|---------------------------|
| `revalidateEvents()` | Upcoming events |
| `revalidateEventAttendees()` | Event RSVP counts |
| `revalidateEventAlbum()` | Event-linked albums |
| `revalidateAlbum()` / `revalidateAlbums()` | Recent albums |
| `revalidateGalleryData()` | Community photostream |
| `revalidateProfiles()` | Organizers, recent members |
| `revalidateChallenges()` / `revalidateChallenge()` | Active challenges |
| `revalidateHome()` | Direct homepage bust (also called from photo upload hooks) |

The events cron (`/api/cron/revalidate-events`, twice daily) also revalidates `home`, `event-attendees`, and `challenges` alongside `events`.

## Changelog revalidation

Changelog pages read markdown from the `changelog/` directory. They are cached with the `changelog` tag (and `changelog-[slug]` on detail pages).

After adding or editing changelog entries and deploying:

```bash
GET /api/revalidate-changelog?secret=REVALIDATION_SECRET
```

This calls `revalidateChangelog()`, which invalidates the `changelog` tag and revalidates `/changelog` and `/changelog/details`. Use `/api/revalidate-all` for a full cache bust.

New `/changelog/[slug]` routes are created at deploy time via `generateStaticParams`. Existing detail pages refresh when the `changelog` tag is invalidated.

## Scheduled and secret revalidation

| Endpoint | Auth | Invalidates |
|----------|------|-------------|
| `GET /api/cron/revalidate-events` | `CRON_SECRET` (Vercel Cron, 2×/day) | `events`, `home` |
| `GET /api/revalidate-changelog?secret=…` | `REVALIDATION_SECRET` | `changelog` (+ changelog paths) |
| `GET /api/revalidate-all?secret=…` | `REVALIDATION_SECRET` | All public tags |

The scraper (`scripts/scraper-utils.ts`) calls `/api/revalidate-all` after inserts when `REVALIDATION_SECRET` is set.

## Meetup events revalidation

Meetup events (`/events`, RSVPs, event albums) use tags `events`, `event-attendees`, `event-[slug]`, and `event-album-[id]`.

### Cached public surfaces

| Route | Page tags | Data tags consumed |
|-------|-----------|-------------------|
| `/` | `home` | `events`, `event-attendees` (upcoming + avatars) |
| `/events` | `events`, `event-attendees` | same |
| `/events/[slug]` | `events`, `event-attendees`, `event-[slug]` | `event-album-[id]` for album section |
| `/scene` | `scene`, `events` | CPG meetups embedded via `getUpcomingEvents` / `getPastEvents` |

The `/scene` page also uses `cacheLife('hours')` for community scene content, but the `events` tag ensures embedded CPG meetups refresh when event CRUD or the events cron runs.

### RSVP vs event metadata

RSVP mutations bust **`event-attendees` and `home` only** — not `events`. That is intentional: attendee avatars and lists refresh without invalidating the full event cache.

Public RSVP counts and “spots left” on the event detail page use **`attendees.length`** from `getEventAttendeesForEvent`, not the `events.rsvp_count` column (which is not maintained by app code).

### Call sites

| Trigger | Location | Helper(s) |
|---------|----------|-----------|
| RSVP signup | `src/app/api/signup/route.ts` | `revalidateEventAttendees()` |
| RSVP confirm / cancel | `src/app/api/confirm/route.ts`, `cancel/route.ts` | `revalidateEventAttendees()` |
| Admin manage RSVP | `src/app/api/admin/manage-rsvp/route.ts` | `revalidateEventAttendees()` |
| Mark attendance | `src/app/api/admin/mark-attendance/route.ts` | `revalidateEventAttendees()` |
| Admin API event CRUD | `src/app/api/admin/events/route.ts` | `revalidateEvents()` (+ attendees on create/delete) |
| Admin UI event editor | `src/app/admin/events/[eventId]/page.tsx` | `revalidateEvents()` + `revalidateEventBySlug()` (old + new slug on rename) |
| Admin event announce | `src/app/api/admin/events/announce/route.ts` | `revalidateEvents()` |
| Event album photo changes | hooks, `AlbumDetailClient`, `revalidateEventAlbum` | `revalidateEventAlbum(eventId)` |
| Admin event album delete/suspend | `src/app/api/admin/albums/delete|suspend|unsuspend` | `revalidateEventAlbum()` + `albums` tag |
| Events cron (2×/day) | `src/app/api/cron/revalidate-events/route.ts` | `events`, `home` |

**Do not use** the deprecated `revalidateEvent()` helper — it misses `home` and `search`. The admin event editor was migrated to `revalidateEvents()`.

**`revalidateEventBySlug(slug)`** is for slug renames or when only one event detail page needs busting. Normal CRUD via `revalidateEvents()` already covers listings; call `revalidateEventBySlug` for the previous slug when renaming.

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

Call `expireTag` when data changes:

```typescript
'use server';
import { expireTag } from '@/lib/cache/expireTag';
import { refresh } from 'next/cache';

export async function revalidateEvents() {
  expireTag('events');
  expireTag('search');
  expireTag('home');
  refresh();
}

export async function revalidateEventAttendees() {
  expireTag('event-attendees');
  expireTag('home');
  refresh();
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
  cacheLife('tagged');
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

**Cache profiles:**

| Profile | Client stale | Server revalidate | Use for |
|---------|--------------|-------------------|---------|
| `tagged` | 0s | 30 days | Most cached data (invalidated via tags) |
| `hourly` | 0s | 1 hour | Events, challenges, gallery most-viewed |

Manual invalidation: call helpers in `src/app/actions/revalidate.ts` (they use `expireTag()` + `refresh()`).

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
| `getEventBySlug(slug)` | `events`, `event-[slug]` | Single event by slug |
| `getEventAttendeesForEvent(id)` | `event-attendees` | Attendees for one event |
| `getEventAttendees(ids)` | `event-attendees` | Attendees for multiple events |

### Album Functions (`src/lib/data/albums.ts`)

| Function | Tags | Description |
|----------|------|-------------|
| `getRecentAlbums(limit)` | `albums` | Recent public albums |
| `getPublicAlbums(limit)` | `albums` | All public albums |
| `getAlbumBySlug(nick, slug)` | `albums`, `profile-[nick]`, `album-[nick]-[slug]` | Single album by slug |
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

> **Cache Duration**: Most functions use `cacheLife('tagged')`. Events/challenges use `cacheLife('hourly')`. Data is cached on the server until `expireTag()` is called.

### Revalidation Functions (`src/app/actions/revalidate.ts`)

| Function | Invalidates | Use When |
|----------|-------------|----------|
| `revalidateEvents()` | `events`, `search`, `home` | Event CRUD |
| `revalidateEventAttendees()` | `event-attendees`, `home` | RSVP changes |
| `revalidateEventBySlug(slug)` | `event-[slug]` | Specific event detail only (not called automatically) |
| `revalidateEventAlbum(id)` | `event-album-[id]`, `events`, `home` | Event album photo changes |
| `revalidateChallengeColorDraws(id)` | `challenge-color-draws`, `challenge-color-draws-[id]` | Color draw/swap |
| `revalidateAlbum(nick, slug)` | `albums`, `profile-[nick]`, `search`, `home`, `album-[n]-[s]` | Album update |
| `revalidateAlbumBySlug(nick, slug)` | `album-[nick]-[slug]`, `profile-[nick]` | Specific album changes (comments, etc.) |
| `revalidateAlbums(nick, slugs)` | `albums`, `profile-[nick]`, `search`, `home` | Bulk album ops |
| `revalidateGalleryData()` | `gallery`, `search`, `home` | Photo CRUD |
| `revalidateTagPhotos(tagName)` | `gallery`, `tag-[tagname]`, `search`, `home` | Photo tagged/untagged |
| `revalidateProfile(nick)` | `profile-[nick]`, `profiles`, `search`, `home` | Profile update |
| `revalidateProfiles()` | `profiles`, `search`, `home` | Member list changes |
| `revalidateChallenges()` | `challenges`, `challenge-photos`, `home` | Challenge CRUD |
| `revalidateChallenge(slug, id?)` | `challenge-[slug]`, `challenges`, `challenge-photos`, `challenge-photos-[id]`, `challenge-color-draws`, `home`, path | Challenge detail changes |
| `revalidatePhoto(shortId)` | `photo-[shortId]` | Photo metadata changes |
| `revalidatePhotos(shortIds)` | `photo-[shortId]` (multiple) | Bulk photo changes |
| `revalidatePhotoLikes(photoId, nick)` | `photo-likes-[photoId]`, `profile-[nick]` | Photo like/unlike |
| `revalidateAlbumLikes(albumId, nick)` | `album-likes-[albumId]`, `profile-[nick]` | Album like/unlike |
| `revalidateScene()` | `scene`, `search`, path `/scene` | Scene CRUD |
| `revalidateSceneEvent(slug)` | `scene-[slug]`, `scene` | Scene event detail changes |
| `revalidateHome()` | `home` | Direct homepage bust |
| `revalidateChangelog()` | `changelog`, paths `/changelog`, `/changelog/details` | Changelog filesystem updates |
| `revalidateAll()` | All tags + layout path | Admin operations |

## Adding New Cached Data

### Step 1: Create Data Function

```typescript
// src/lib/data/yourEntity.ts
import { cacheTag, cacheLife } from 'next/cache';
import { createPublicClient } from '@/utils/supabase/server';

export async function getYourData() {
  'use cache';
  cacheLife('tagged');
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
import { expireTag } from '@/lib/cache/expireTag';
import { refresh } from 'next/cache';

export async function revalidateYourEntity() {
  expireTag('your-tag');
  refresh();
}
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
4. **Use `tagged` / `hourly` profiles**: `stale: 0` so clients always check the server after mutations
5. **Batch parallel fetches**: Use `Promise.all()` for multiple data sources
6. **Expire immediately**: Use `expireTag()` from `src/lib/cache/expireTag.ts` (not `revalidateTag(tag, 'max')`, which is stale-while-revalidate)

## Troubleshooting

### Data not updating after mutation?
- Ensure you're calling the correct revalidation function
- Check that the tag matches between data function and revalidation
- Helpers use `expireTag()` (`revalidateTag(tag, { expire: 0 })`), not `revalidateTag(tag, 'max')`
- Server Actions also call `refresh()` so the mutating browser drops its router cache

### Stale data until hard refresh?
- Avoid `cacheLife('max')` — its built-in `stale: 300` keeps client RSC for 5 minutes
- Use `cacheLife('tagged')` or `cacheLife('hourly')` from `next.config.ts`
- Set `experimental.staleTimes` to `{ dynamic: 0, static: 0 }`

### "Blocking Route" / uncached data during prerendering?
- The **root layout** must not call `connection()` or `getServerAuth()` — that blocks `'use cache'` pages (e.g. `/gallery`)
- Session is **client-bootstrapped** via `AuthContext` (`supabase.auth.getSession()`); `SessionProvider` starts with empty auth
- Auth-gated segments (`/account`, `/admin`, manage routes) own server guards with `connection()` inside segment-level `<Suspense>`
- `useSearchParams()` in client pages needs a page-level `<Suspense>` boundary (see `/account`, `/email/changed`)

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
  cacheLife('tagged');
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

Routes that require authentication (e.g., `/account/*`) should never be cached. Use `connection()` from `next/server` in the layout and make all page components client components:

```typescript
// src/app/account/layout.tsx
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getServerAuth } from '@/utils/supabase/getServerAuth';

export default async function AccountLayout({ children }) {
  // Opt out of static generation - account pages require authentication
  await connection();

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
- Layout uses `await connection()` from `next/server` to opt out of static generation
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
