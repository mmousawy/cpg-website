# Revalidation Quick Reference

## Cache Tags

| Tag | What it caches |
|-----|----------------|
| `events` | Event listings, details |
| `event-[slug]` | Specific event detail page |
| `event-attendees` | RSVP lists per event |
| `albums` | Album listings (gallery, homepage) |
| `album-[nick]-[slug]` | Specific album detail page |
| `gallery` | Community photostream, popular tags |
| `profiles` | Members/organizers lists |
| `profile-[nick]` | Specific user's data |
| `tag-[tagname]` | Photos with a specific tag |
| `challenges` | Challenge listings |
| `challenge-[slug]` | Specific challenge detail page |
| `challenge-photos` | Accepted photos in challenges |
| `challenge-photos-[id]` | Photos for a specific challenge |
| `photo-[shortId]` | Specific photo detail page |
| `photo-likes-[photoId]` | Like count for a specific photo |
| `album-likes-[albumId]` | Like count for a specific album |
| `notifications-[userId]` | Notifications for a specific user |
| `search` | Search results |
| `home` | Homepage shell (`src/app/page.tsx`) |
| `changelog` | Changelog index, details, and detail pages |
| `changelog-[slug]` | Specific changelog detail page |
| `scene` | Scene event listings |
| `scene-[slug]` | Specific scene event detail page |
| `challenge-color-draws` | All challenge color draws |
| `challenge-color-draws-[id]` | Color draws for one challenge |
| `event-album-[id]` | Event album photos for one event |
| `interests` | All interests data |
| `interest-[name]` | Members with a specific interest |

## When to Revalidate

| Action | Call |
|--------|------|
| Event created/updated/deleted | `revalidateEvents()` (+ `revalidateEventBySlug` on slug rename) |
| Event album photos changed | `revalidateEventAlbum(eventId)` |
| Specific event detail only | `revalidateEventBySlug(slug)` |
| RSVP signup/confirm/cancel | `revalidateEventAttendees()` (does **not** bust `events`) |
| Album created/updated/deleted | `revalidateAlbum(nickname, slug)` |
| Specific album changed (granular) | `revalidateAlbumBySlug(nickname, slug)` |
| Bulk album operations | `revalidateAlbums(nickname, slugs)` |
| Photo created/updated/deleted | `revalidateGalleryData()` |
| Photo metadata changed | `revalidatePhoto(shortId)` |
| Bulk photo changes | `revalidatePhotos(shortIds)` |
| Photo tagged/untagged | `revalidateTagPhotos(tagName)` (also busts `home`) |
| Photo liked/unliked | `revalidatePhotoLikes(photoId, nickname)` (also busts `gallery`, `home`) |
| Album liked/unliked | `revalidateAlbumLikes(albumId, nickname)` (also busts `gallery`, `home`) |
| User profile updated | `revalidateProfile(nickname)` (also busts `profiles`, `home`) |
| User onboarding complete | `revalidateProfile(nickname)` |
| New user signed up | `revalidateProfiles()` |
| Photo added to album | `revalidateAlbum(nickname, slug)` |
| Challenge created/updated/deleted | `revalidateChallenges()` |
| Challenge detail changed | `revalidateChallenge(slug, id?)` |
| Color draw or swap | `revalidateChallengeColorDraws(challengeId)` |
| Scene event created/updated/deleted | `revalidateScene()` |
| Scene event detail changed | `revalidateSceneEvent(slug)` |
| Homepage content changed | `revalidateHome()` (also cascades from event/album/gallery/challenge/profile helpers) |
| Changelog updated (after deploy) | `GET /api/revalidate-changelog?secret=…` or `revalidateChangelog()` |
| Admin suspends user | `revalidateAll()` |
| Admin deletes user | `revalidateAll()` |

> **Homepage note:** `revalidateEvents()`, `revalidateEventAttendees()`, `revalidateAlbum()`, `revalidateAlbums()`, `revalidateGalleryData()`, `revalidateProfiles()`, `revalidateChallenges()`, and `revalidateChallenge()` also invalidate the `home` tag.

> **Granular helpers:** `revalidateEventBySlug(slug)` only busts one event detail page — call it explicitly when needed (e.g. slug rename); it is not invoked by other helpers.

> **RSVP counts:** Public capacity UI uses `attendees.length`, not `events.rsvp_count`. RSVP helpers only bust `event-attendees` + `home`.

> **Scene page:** `/scene` tags both `scene` and `events` so embedded CPG meetups refresh with event CRUD/cron.

## Secret / scheduled endpoints

| Endpoint | When |
|----------|------|
| `GET /api/cron/revalidate-events` | Vercel Cron (2×/day) — `events`, `event-attendees`, `challenges`, `home` |
| `GET /api/revalidate-changelog?secret=…` | After changelog filesystem updates |
| `GET /api/revalidate-all?secret=…` | Full public cache bust (scraper, manual) |

## Import

```typescript
import {
  revalidateEvents,
  revalidateEventAttendees,
  revalidateEventBySlug,
  revalidateEventAlbum,
  revalidateChallengeColorDraws,
  revalidateAlbum,
  revalidateAlbumBySlug,
  revalidateAlbums,
  revalidateGalleryData,
  revalidateTagPhotos,
  revalidateProfile,
  revalidateProfiles,
  revalidatePhoto,
  revalidatePhotos,
  revalidatePhotoLikes,
  revalidateAlbumLikes,
  revalidateChallenges,
  revalidateChallenge,
  revalidateScene,
  revalidateSceneEvent,
  revalidateHome,
  revalidateChangelog,
  revalidateAll,
} from '@/app/actions/revalidate';
```

## Cached Data Functions

Most functions use `cacheLife('tagged')` (no client stale window). Events, challenges, and the gallery homepage use `cacheLife('hourly')` (1-hour server revalidate). All are busted immediately via `expireTag()` when tags are invalidated.

```typescript
// Events
import {
  getRecentEvents,
  getUpcomingEvents,
  getPastEvents,
  getEventBySlug,
  getEventAttendeesForEvent,
  getEventAttendees,
} from '@/lib/data';

// Albums
import {
  getRecentAlbums,
  getPublicAlbums,
  getAlbumBySlug,
  getPhotosByUrls,
  getUserPublicAlbums,
} from '@/lib/data';

// Profiles & Photos
import {
  getOrganizers,
  getRecentMembers,
  getProfileByNickname,
  getUserPublicPhotos,
  getUserPublicPhotoCount,
  getProfileStats,
  getPhotoByShortId,
  getAlbumPhotoByShortId,
} from '@/lib/data';

// Gallery (Community Photostream & Tags)
import {
  getPublicPhotostream,
  getPopularTags,
  getPhotosByTag,
  getAllTagNames,
} from '@/lib/data';
```

## Adding New Cached Data

1. Create function in `src/lib/data/`:
```typescript
export async function getYourData() {
  'use cache';
  cacheLife('tagged');
  cacheTag('your-tag');
  // fetch data...
}
```

2. Export from `src/lib/data/index.ts`

3. Add revalidation in `src/app/actions/revalidate.ts`:
```typescript
import { expireTag } from '@/lib/cache/expireTag';
import { refresh } from 'next/cache';

export async function revalidateYourData() {
  expireTag('your-tag');
  refresh();
}
```

4. Call revalidation after mutations

## Cache Components Patterns

| Issue | Solution |
|-------|----------|
| `Math.random()` in client component | `useState` lazy initializer + wrap in `<Suspense>` |
| `new Date()` in client component | Just use it directly - client components are safe |
| Dynamic route blocking error | Add `generateStaticParams` returning at least one sample |
| Route needs loading skeleton | Add `loading.tsx` to route folder |
| Third-party lib uses Date | Dynamic import with `ssr: false` in wrapper |
| Authenticated routes | Use `await connection()` in layout + `'use client'` pages |

> Note: With `cacheComponents: true`, client components that call `Math.random()` must sit under a `<Suspense>` boundary or Next.js will warn.

## Files

- **Data layer**: `src/lib/data/*.ts`
- **Cache helpers**: `src/lib/cache/expireTag.ts`
- **Revalidation actions**: `src/app/actions/revalidate.ts`
- **Secret endpoints**: `src/app/api/revalidate-all/route.ts`, `src/app/api/revalidate-changelog/route.ts`
- **Config**: `next.config.ts` (`cacheComponents`, `cacheLife.tagged`, `cacheLife.hourly`, `staleTimes`)
