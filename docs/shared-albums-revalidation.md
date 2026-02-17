# Shared Albums – Cache Tags and Revalidation

## Overview

Shared album mutations use the same revalidation helpers as personal albums. React Query keys are invalidated client-side; Next.js cache tags are invalidated via server actions.

## Mutation → Revalidation Mapping

| Mutation | React Query Keys | Server Revalidation |
|----------|------------------|---------------------|
| `join_shared_album` | `shared-album-members`, `shared-album-membership`, `shared-album-requests` | `revalidateAlbumBySlug`, `revalidateAlbum` |
| `leave_shared_album` | `shared-album-members`, `shared-album-membership` | `revalidateAlbumBySlug`, `revalidateAlbum` |
| `invite_to_shared_album` | `shared-album-requests` | `revalidateAlbumBySlug` |
| `resolve_album_request` | `shared-album-members`, `shared-album-requests`, `shared-album-membership` | `revalidateAlbumBySlug`, `revalidateAlbum` |
| `add_photos_to_shared_album` | `album-photos`, `album-photos-count` | `revalidateAlbumBySlug`, `revalidateAlbum`, `revalidateGalleryData` |
| `remove_shared_album_photo` | `album-photos`, `album-photos-count` | `revalidateAlbumBySlug`, `revalidateAlbum`, `revalidateGalleryData` |
| `create_event_album` | N/A (server-side) | `revalidateEvents`, `revalidateEventBySlug`, `revalidateAlbum` |

## Cache Tags Used

- `albums` – Album listings
- `album-[nickname]-[slug]` – Specific album (via `revalidateAlbum`)
- `profile-[nickname]` – User profile and albums
- `events` – Event listings
- `event-[slug]` – Event detail (for event album)
- `event-album-[eventId]` – Event album data
- `gallery` – Community photostream (when album photos change)

## Implementation

Revalidation is triggered from:

- `src/hooks/useSharedAlbumMembers.ts` – Join, leave, invite, resolve
- `src/hooks/useSharedAlbumSubmissions.ts` – Add/remove photos
- `src/app/actions/revalidate.ts` – Helper functions used by hooks
