# CPG Website Documentation

## Contents

### Caching & Revalidation

- **[revalidation-system.md](./revalidation-system.md)** - Complete guide to the tag-based caching and revalidation system
- **[revalidation-quick-reference.md](./revalidation-quick-reference.md)** - Quick reference for cache tags and revalidation functions

### SEO & Metadata

- **[metadata.md](./metadata.md)** - Metadata, OpenGraph, and Twitter card implementation

## Key Concepts

### `use cache` Directive

The project uses Next.js's `use cache` directive for component-level caching. Data functions in `src/lib/data/` are cached with specific tags that can be invalidated when data changes.

### Cache Tags

- `events` - Event listings and details
- `event-attendees` - RSVP/attendee data (separate for granular control)
- `albums` - Album listings
- `profiles` - Member/organizer lists
- `profile-[nickname]` - Specific user profile data

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/data/*.ts` | Cached data fetch functions |
| `src/app/actions/revalidate.ts` | Revalidation server actions |
| `next.config.ts` | Enable `cacheComponents: true` |

## Quick Start

### Fetching Cached Data

```typescript
import { getRecentEvents, getRecentAlbums } from '@/lib/data';

const [events, albums] = await Promise.all([
  getRecentEvents(6),
  getRecentAlbums(6),
]);
```

### Invalidating Cache

```typescript
import { revalidateEventAttendees } from '@/app/actions/revalidate';

// After RSVP change
await revalidateEventAttendees();
```

## Further Reading

See individual documentation files for detailed implementation guides and examples.
