# Files Changed - Shared Albums, Event Albums, Code Quality

## Overview

Major feature release adding collaborative shared albums and automatic event albums. Albums can now be shared with other members via open (anyone can join) or closed (invite/request only) membership. Events automatically get an album where any logged-in member can contribute photos. Also includes a Chrome-specific BlurImage compositing fix, React Compiler compatibility improvements, and various ESLint/TypeScript fixes.

## Shared Albums

### Concept

Albums can now be "shared" — multiple members can contribute photos to a single album. Two join policies:

- **Open**: any member can join instantly
- **Closed**: members must request to join or be invited by the owner

The album owner can set a per-user photo limit (`max_photos_per_user`) and manage members (invite, remove, accept/decline requests).

### Database (`supabase/migrations/00000000000000_baseline.sql`)

New tables and columns consolidated into baseline:

- `shared_album_members` — tracks who's a member of which shared album
- `shared_album_requests` — join requests and invites (status: pending/accepted/declined)
- `albums.is_shared`, `albums.join_policy`, `albums.max_photos_per_user`, `albums.event_id`
- `album_photos.added_by` — tracks who added each photo

New RPCs:
- `add_photos_to_shared_album` — adds photos with `added_by` tracking
- `remove_shared_album_photo` — removes a photo from a shared album
- `join_shared_album` / `leave_shared_album` — membership management
- `invite_to_shared_album` / `resolve_album_request` — invite/request flow
- `remove_album_member` — owner removes a member
- `add_shared_album_owner` — adds album owner as first member when enabling sharing

### Components (`src/components/albums/`)

Seven new components for the shared album UI:

| Component | Purpose |
|-----------|---------|
| `JoinAlbumButton` | Join open/closed albums, shows pending request status |
| `SubmitToSharedAlbumButton` | Opens modal to add photos, respects per-user limits |
| `SubmitToSharedAlbumContent` | Modal content: select from library or upload, shows quota |
| `SharedAlbumMemberList` | Member list with avatars, owner badge, remove action |
| `AlbumRequestsPanel` | Pending join requests and invites with accept/decline |
| `InviteMembersModal` | Search and invite members (excludes existing/pending) |
| `AlbumSharedActions` | Combines join + submit buttons for public album pages |

### Hooks

- `src/hooks/useSharedAlbumMembers.ts` — queries for members, requests, membership status; mutations for join/leave/invite/resolve/remove
- `src/hooks/useSharedAlbumSubmissions.ts` — queries for album photo IDs and per-user count; mutation for adding photos

### Management UI Changes

- `SingleAlbumEditForm` — toggle to enable sharing, join policy selector, max photos per user
- `SharedAlbumEditForm` — full edit form for shared albums with member management
- `AlbumEditSidebar` — routes to correct form based on album type
- `AlbumSwitcher` — sections for "Your albums", "Your shared albums", "Shared with you", "Event albums"
- `AddPhotosToAlbumModal` — shows shared-with-me albums, uses separate RPC for shared albums
- Albums page (`/account/albums`) — new collapsible sections for shared albums, shared-with-me, event albums, pending invites
- Album detail page — read-only sidebar for shared-with-me albums, owner info display

### Notifications

- `src/app/api/albums/requests/notify/route.ts` — POST endpoint handling: request received, invite received, request accepted/declined, invite accepted
- `NotificationContent` — renders shared album notification types

## Event Albums

### Concept

Every event automatically gets a photo album. Any logged-in member can add photos (no join required). The album is "ownerless" — it belongs to the event, not a specific user.

### Database

- Trigger on `events` INSERT creates an album with `event_id` set and `join_policy = null`
- Backfill creates albums for existing events
- Event soft-delete cascades to album soft-delete

### Components

- `EventPhotosSection` (`src/components/events/EventPhotosSection.tsx`) — displays event album photos in a justified grid with attribution, "Add photos" button for logged-in users
- Event page (`src/app/events/[eventSlug]/page.tsx`) — fetches event album via `getEventAlbum()`, renders photo section

### Data Layer

- `src/lib/eventAlbums.ts` — types and helpers (`EventAlbum`, `hasEventPhotos()`, `getEventPhotoCount()`)
- `src/lib/data/albums.ts` — `getEventAlbum()` function for server-side fetching

## Photo Attribution in Shared Albums

### Problem

When viewing a photo in a shared album, the sidebar always showed the album owner's profile instead of the actual photo owner.

### Solution

- `getAlbumPhotoByShortId` (`src/lib/data/profiles.ts`) now fetches the photo owner's profile when `photo.user_id` differs from the album owner, and returns `albumOwnerNickname` separately
- `PhotoPageContent` uses `albumOwnerNickname` for filmstrip/navigation URLs (album lives under the owner's profile) while showing the photo owner in the author row
- `AlbumContent` fetches owner profiles for all unique photo owners via `getProfilesByUserIds()` and passes them to the grid

## BlurImage Chrome Compositing Fix

### Problem

In Chrome, the blurhash placeholder background was bleeding through the edges of the main image during the fade-in animation. This is a Chrome compositor bug where a semi-transparent element composited over its parent's `backgroundImage` causes edge artifacts.

### Solution (`src/components/shared/BlurImage.tsx`)

Instead of using `backgroundImage` on the parent wrapper (which Chrome composites as a single layer), the blurhash is now rendered as a separate absolutely-positioned `<span>` element behind the image:

```tsx
<span className="block relative overflow-hidden">
  {/* Blurhash as separate layer */}
  <span
    className="absolute inset-0 z-0"
    style={{ backgroundImage: `url(${blurhashDataUrl})`, backgroundSize: '100% 100%' }}
  />
  {/* Image on top */}
  <Image className={`${opacityClass} relative z-10`} onAnimationEnd={handleAnimationEnd} />
</span>
```

Also added `onAnimationEnd` to transition from `fade-in` to `visible` state, allowing cleanup after the animation completes.

## Code Quality Fixes

### React Compiler Compatibility

React Hook Form's `watch()` method returns a mutable object that the React Compiler can't safely memoize. Replaced with `useWatch()` (a proper hook) across all form components:

```tsx
// Before — causes "Compilation Skipped: Use of incompatible library"
const { watch } = useForm();
const slug = watch('slug');

// After — React Compiler can track this
const { control } = useForm();
const slug = useWatch({ control, name: 'slug' });
```

Files affected: `SingleAlbumEditForm`, `SharedAlbumEditForm`, `SinglePhotoEditForm`, `BulkPhotoEditForm`, `BulkAlbumEditForm`

### ESLint Fixes

- Moved async functions inside `useEffect` to fix missing dependency warnings (`AnnounceChallengeModal`, `AnnounceEventModal`, `EmailAttendeesModal`)
- Removed unnecessary `onClose` from `useCallback` deps (using ref pattern instead)
- Added missing deps (`supabase`, `modalContext`, `updatePosition`, `reset`)
- Moved form default values to module-level constants to avoid dependency warnings
- Extracted `sectionIds.join(',')` to a variable for stable `useEffect` deps

### TypeScript Fixes

- Wrapped `supabase.rpc().then()` in `Promise.resolve()` for strict `Promise` typing
- Fixed `string | null` vs `string | undefined` mismatches with nullish coalescing
- Made `previousAlbums` optional in mutation type
- Fixed duplicate `role`/`tabIndex` props in `SortableGridItem` by reordering spread

### Other

- Replaced `<img>` with `next/image` in `InviteMembersModal` for optimization
- Refactored `setState`-in-effect to render-phase state adjustments in `SingleAlbumEditForm`

## Migration Consolidation

16 individual migrations (from 2026-01-23 through 2026-02-07) were consolidated into the baseline migration. These covered: album photo normalization, stats RPCs, global search, view tracking, signup bypass tokens, photo challenges (full feature), comment replies, and reports.

4 new migrations added:
- `20260216300000_admin_event_album_permissions.sql` — admin permissions for event albums
- `20260216400000_fix_soft_delete_stats.sql` — fix stats RPCs to exclude soft-deleted items
- `20260217000000_add_shared_album_owner_rpc.sql` — RPC to add album owner as member
- `20260217100000_add_remove_album_member_rpc.sql` — RPC to remove album members

## All Modified Files (92 total)

### New Files (19)
- `docs/event-albums.md` — Event albums documentation
- `docs/shared-albums.md` — Shared albums documentation
- `docs/shared-albums-revalidation.md` — Cache invalidation strategy
- `public/icons/lock-micro.svg` — Lock icon for closed albums
- `public/icons/users-micro.svg` — Users icon for shared albums
- `src/app/api/albums/requests/notify/route.ts` — Album notification endpoint
- `src/components/albums/AlbumRequestsPanel.tsx` — Join request management
- `src/components/albums/AlbumSharedActions.tsx` — Combined shared album actions
- `src/components/albums/InviteMembersModal.tsx` — Member invite modal
- `src/components/albums/JoinAlbumButton.tsx` — Join/request button
- `src/components/albums/SharedAlbumMemberList.tsx` — Member list display
- `src/components/albums/SubmitToSharedAlbumButton.tsx` — Submit photos button
- `src/components/albums/SubmitToSharedAlbumContent.tsx` — Photo submission modal
- `src/components/events/EventPhotosSection.tsx` — Event album photo grid
- `src/components/manage/SharedAlbumEditForm.tsx` — Shared album edit form
- `src/hooks/useSharedAlbumMembers.ts` — Membership hooks
- `src/hooks/useSharedAlbumSubmissions.ts` — Submission hooks
- `src/lib/eventAlbums.ts` — Event album types and helpers
- `supabase/migrations/20260216300000_admin_event_album_permissions.sql`

### Modified Files (73)
- `README.md`, `docs/README.md` — Updated features and docs
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx` — Shared album attribution
- `src/app/[nickname]/album/[albumSlug]/photo/[photoId]/page.tsx` — Album owner nickname passthrough
- `src/app/account/(manage)/albums/[slug]/AlbumDetailClient.tsx` — Shared album detail view
- `src/app/account/(manage)/albums/page.tsx` — Shared/event album sections
- `src/app/account/(manage)/photos/page.tsx` — Minor updates
- `src/app/account/events/page.tsx` — Dependency fix
- `src/app/api/admin/albums/delete/route.ts` — Shared album support
- `src/app/api/admin/albums/suspend/route.ts` — Shared album support
- `src/app/api/admin/albums/unsuspend/route.ts` — Shared album support
- `src/app/api/comments/route.ts` — Shared album context
- `src/app/challenges/[slug]/page.tsx` — Minor updates
- `src/app/events/[eventSlug]/page.tsx` — Event album integration
- `src/app/globals.css` — Minor CSS updates
- `src/app/help/page.tsx`, `src/app/page.tsx` — Minor updates
- `src/app/signup/SignupClient.tsx` — Minor updates
- `src/components/admin/AnnounceChallengeModal.tsx` — ESLint fixes
- `src/components/admin/AnnounceEventModal.tsx` — ESLint fixes
- `src/components/admin/EmailAttendeesModal.tsx` — ESLint fixes
- `src/components/album/AlbumMiniCard.tsx` — Owner nickname display
- `src/components/challenges/SubmitToChallengeContent.tsx` — Minor updates
- `src/components/events/EventRsvpStatus.tsx`, `EventSignupBar.tsx` — Minor updates
- `src/components/layout/Layout.tsx`, `PageContainer.tsx` — Minor updates
- `src/components/manage/AddPhotosToAlbumModal.tsx` — Shared album support
- `src/components/manage/AddToAlbumContent.tsx` — Shared album support
- `src/components/manage/AlbumCard.tsx` — Shared album badges
- `src/components/manage/AlbumEditSidebar.tsx` — Form routing
- `src/components/manage/AlbumGrid.tsx` — Minor updates
- `src/components/manage/AlbumPicker.tsx` — Minor updates
- `src/components/manage/AlbumSwitcher.tsx` — Shared/event sections
- `src/components/manage/BulkAlbumEditForm.tsx` — useWatch fix
- `src/components/manage/BulkPhotoEditForm.tsx` — useWatch fix
- `src/components/manage/ManageLayout.tsx` — Minor updates
- `src/components/manage/MobileActionBar.tsx` — Shared album actions
- `src/components/manage/PhotoCard.tsx` — Owner attribution
- `src/components/manage/PhotoEditSidebar.tsx` — Minor updates
- `src/components/manage/PhotoGrid.tsx` — Attribution support
- `src/components/manage/SelectableGrid.tsx` — Minor updates
- `src/components/manage/SingleAlbumEditForm.tsx` — Sharing toggle, useWatch fix
- `src/components/manage/SinglePhotoEditForm.tsx` — useWatch fix
- `src/components/manage/SortableGridItem.tsx` — Prop spreading fix
- `src/components/notifications/NotificationContent.tsx` — Album notification types
- `src/components/notifications/ToastProvider.tsx` — Minor updates
- `src/components/photo/JustifiedPhotoGrid.tsx` — Attribution support
- `src/components/photo/PhotoPageContent.tsx` — Album owner nickname
- `src/components/shared/AlbumActionsMenu.tsx`, `AlbumActionsPopover.tsx` — Minor updates
- `src/components/shared/BlurImage.tsx` — Chrome compositing fix
- `src/components/shared/Button.tsx` — Minor updates
- `src/components/shared/ReportModal.tsx` — Minor updates
- `src/components/shared/SignUpCTA.tsx` — Minor updates
- `src/components/shared/Tooltip.tsx` — Dependency fix
- `src/content/help/photos.tsx` — Shared album FAQ entries
- `src/context/ManageDataContext.tsx` — Minor updates
- `src/database.types.ts` — New tables, RPCs, and fields
- `src/hooks/useAccountForm.ts` — Dependency fix
- `src/hooks/useActiveHelpSection.ts` — Dependency fix
- `src/hooks/useAlbumMutations.ts` — Shared album mutations
- `src/hooks/useAlbumPhotoMutations.ts` — Shared album support
- `src/hooks/useAlbumPhotos.ts` — Null handling fixes
- `src/hooks/useAlbums.ts` — Shared/event album hooks
- `src/lib/actions/likes.ts` — Minor updates
- `src/lib/data/albums.ts` — getProfilesByUserIds, getEventAlbum
- `src/lib/data/likes.ts` — Minor updates
- `src/lib/data/profiles.ts` — Photo owner attribution
- `src/types/albums.ts` — Shared album types
- `src/types/events.ts` — Event album fields
- `src/types/notifications.ts` — Album notification types
- `src/types/photos.ts` — Attribution fields
- `src/utils/confirmHelpers.tsx` — Shared album confirmations
- `supabase/migrations/00000000000000_baseline.sql` — Consolidated + shared albums
