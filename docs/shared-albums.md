# Shared Albums (Community Photo Albums)

## Overview

Shared albums allow multiple members to contribute photos to a single album. There are two flavors:

1. **User-created shared albums** – A member creates a shared album and others join. Two membership modes:
   - **Open** – Any member can join freely and start contributing
   - **Closed** – Members must be invited by the owner or request to join (owner approves)
2. **Event albums** – Automatically created by the system for each event; any logged-in member can contribute photos directly (no join step needed).

Photos added to shared albums are **immediately visible** (no review queue). Only the **album creator** (or site admins for event albums) can manage the album. The photo contribution flow mirrors the challenge submission flow (upload new + select from library).

## Membership Model

| Album Type | Join Policy | How to Contribute |
|------------|-------------|-------------------|
| Personal | N/A | Owner only |
| Shared (open) | Open | Join instantly, then add photos |
| Shared (closed) | Closed | Request to join or accept invite, then add photos |
| Event album | N/A | Any member can add (no join needed) |

## User Flows

### Creating a Shared Album

1. Account → Albums → New shared album
2. Set title, slug, description, visibility
3. Choose join policy: Open or Closed
4. Optionally set photos-per-member limit
5. Owner is automatically added as first member

### Joining an Open Album

1. View shared album (public page)
2. Click "Join album"
3. Immediately become a member
4. Add photos via "Add photos" button

### Joining a Closed Album (Request)

1. View shared album
2. Click "Request to join"
3. Owner sees pending request in album management
4. Owner accepts or declines
5. If accepted, user becomes member and can add photos

### Inviting to a Closed Album

1. Owner opens album in account management
2. Clicks "Invite members"
3. Searches for members by name/nickname
4. Selects users and clicks Invite
5. Invited users receive notification
6. User accepts or declines invite
7. If accepted, user becomes member

### Adding Photos to a Shared Album

1. Must be a member (or any member for event albums)
2. Click "Add photos" on album page
3. Upload new photos or select from library
4. Review and confirm
5. Photos appear immediately with contributor attribution

## Key Files

- `src/components/albums/` – JoinAlbumButton, SubmitToSharedAlbumButton, SharedAlbumMemberList, InviteMembersModal, AlbumRequestsPanel
- `src/hooks/useSharedAlbumMembers.ts` – Membership, join, leave, invite, resolve
- `src/hooks/useSharedAlbumSubmissions.ts` – Add/remove photos
- `src/components/manage/SharedAlbumEditForm.tsx` – Shared album settings and member management
