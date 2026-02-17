# Event Albums

## Overview

Event albums are automatically created for each event. Any logged-in member can add photos without joining. They are shared albums with `event_id` set and `join_policy` null.

## Auto-Creation

### Database Trigger

On `events` INSERT, the trigger `trigger_after_event_insert` calls `create_event_album(NEW.id)`. The RPC:

1. Checks if an album already exists for the event
2. If yes, returns existing album ID
3. If no, creates album with:
   - `title`: `{event.title} Photos`
   - `slug`: `event-{eventId}-photos`
   - `is_shared`: true
   - `created_by_system`: true
   - `event_id`: event ID
   - `join_policy`: null
   - `user_id`: first admin (or first profile)

### Backfill

The migration includes a one-time backfill for existing events that do not have an album. Uses `ON CONFLICT (user_id, slug) DO NOTHING` for idempotency.

## Event Page Integration

- `EventPhotosSection` component shows a preview of the event album
- "Add photos" button for logged-in members
- Link to full album at `/@{ownerNickname}/album/event-{eventId}-photos`

## Data Layer

- `getEventAlbum(eventId)` – Fetches album for an event (cached)
- Cache tags: `albums`, `events`, `event-album-{eventId}`

## Event Deletion

When an event is deleted, the linked event album is soft-deleted in the same flow. Event albums are not detached or kept as read-only archives.

## Repair Strategy

If an event is missing its album (e.g. trigger failed), the `create_event_album` RPC can be called manually with the event ID. It is idempotent and will create the album if missing.
