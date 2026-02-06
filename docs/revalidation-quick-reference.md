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
| `home` | Homepage data |
| `changelog` | Changelog data |
| `interests` | All interests data |
| `interest-[name]` | Members with a specific interest |

## When to Revalidate

| Action | Call |
|--------|------|
| Event created/updated/deleted | `revalidateEvents()` |
| Specific event changed | `revalidateEventBySlug(slug)` |
| RSVP signup/confirm/cancel | `revalidateEventAttendees()` |
| Album created/updated/deleted | `revalidateAlbum(nickname, slug)` |
| Specific album changed (granular) | `revalidateAlbumBySlug(nickname, slug)` |
| Bulk album operations | `revalidateAlbums(nickname, slugs)` |
| Photo created/updated/deleted | `revalidateGalleryData()` |
| Photo metadata changed | `revalidatePhoto(shortId)` |
| Bulk photo changes | `revalidatePhotos(shortIds)` |
| Photo tagged/untagged | `revalidateTagPhotos(tagName)` |
| Photo liked/unliked | `revalidatePhotoLikes(photoId, nickname)` |
| Album liked/unliked | `revalidateAlbumLikes(albumId, nickname)` |
| User profile updated | `revalidateProfile(nickname)` |
| User onboarding complete | `revalidateProfile(nickname)` |
| New user signed up | `revalidateProfiles()` |
| Photo added to album | `revalidateAlbum(nickname, slug)` |
| Challenge created/updated/deleted | `revalidateChallenges()` |
| Challenge detail changed | `revalidateChallenge(slug, id?)` |
| Homepage content changed | `revalidateHome()` |
| Changelog updated | `revalidateChangelog()` |
| Admin suspends user | `revalidateAll()` |
| Admin deletes user | `revalidateAll()` |

## Import

```typescript
import {
  revalidateEvents,
  revalidateEventAttendees,
  revalidateEventBySlug,
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
  revalidateHome,
  revalidateChangelog,
  revalidateAll,
} from '@/app/actions/revalidate';
```

## Cached Data Functions

All functions use `cacheLife('max')` - cached indefinitely until tags are invalidated.

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
  cacheLife('max'); // Cache forever until tag is invalidated
  cacheTag('your-tag');
  // fetch data...
}
```

2. Export from `src/lib/data/index.ts`

3. Add revalidation in `src/app/actions/revalidate.ts`:
```typescript
export async function revalidateYourData() {
  revalidateTag('your-tag', 'max');
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
- **Revalidation actions**: `src/app/actions/revalidate.ts`
- **Config**: `next.config.ts` (`cacheComponents: true`)
