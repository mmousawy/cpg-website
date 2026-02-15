# CPG Website Documentation

## Contents

### Caching & Revalidation

- **[revalidation-system.md](./revalidation-system.md)** - Complete guide to the tag-based caching and revalidation system
- **[revalidation-quick-reference.md](./revalidation-quick-reference.md)** - Quick reference for cache tags and revalidation functions

### Performance

- **[performance-optimization.md](./performance-optimization.md)** - Bundle analysis, lazy loading patterns, and performance monitoring

### SEO & Metadata

- **[metadata.md](./metadata.md)** - Metadata, OpenGraph, and Twitter card implementation

### Email Notifications

- **[email-notifications.md](./email-notifications.md)** - Email notification system, automated reminders, and manual sending

### View Tracking

- **[view-tracking-caching.md](./view-tracking-caching.md)** - View count tracking and caching strategy

### Image Optimization

The project uses a custom image loader (`src/utils/supabaseImageLoader.ts`) that handles different image sources:

| Image Type | Optimization |
|------------|-------------|
| **Supabase images** | Resized via `/render/image/public/` endpoint with width/quality params |
| **Local images** | Served directly with width hint for Next.js compatibility |
| **External images** | Served as-is (discord, google, meetupstatic) |

Key optimizations:
- **HeroImage**: Responsive sizes with 1200px max width cap
- **JustifiedPhotoGrid**: Dynamic sizing based on actual display width (1.5x for retina)
- **Supabase transforms**: Proper `/render/image/` endpoint for server-side resizing

### Code Quality

- **Type Safety** - The codebase maintains strict TypeScript type safety with zero `any` types. All Supabase queries, React Hook Form props, error handling, and callback parameters are properly typed.

## Key Concepts

### `use cache` Directive

The project uses Next.js's `use cache` directive for component-level caching. Data functions in `src/lib/data/` are cached with specific tags that can be invalidated when data changes.

### Cache Tags

- `events` - Event listings and details
- `event-attendees` - RSVP/attendee data (separate for granular control)
- `albums` - Album listings
- `gallery` - Community photostream and popular tags
- `profiles` - Member/organizer lists and member discovery data
- `profile-[nickname]` - Specific user profile data
- `tag-[tagname]` - Photos with a specific tag
- `interests` - All interests data
- `interest-[name]` - Members with a specific interest

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/data/*.ts` | Cached data fetch functions |
| `src/app/actions/revalidate.ts` | Revalidation server actions |
| `src/types/supabase-queries.ts` | Typed Supabase query result types for joins |
| `src/utils/supabaseImageLoader.ts` | Custom image loader for Supabase transformations |
| `next.config.ts` | Enable `cacheComponents: true`, custom image loader |

### Type Safety

The codebase maintains strict TypeScript type safety:

- **Zero `any` types** - All types are explicitly defined
- **Proper error handling** - Uses `unknown` type with `instanceof` checks
- **Typed Supabase queries** - Custom types in `src/types/supabase-queries.ts` for join results
- **React Hook Form** - Properly typed with generics (`UseFormRegister`, `FieldErrors`, etc.)
- **Type guards** - Used throughout for runtime type checking

## Quick Start

### Fetching Cached Data

```typescript
import { getRecentEvents, getRecentAlbums, getPopularInterests, getRecentlyActiveMembers } from '@/lib/data';

const [events, albums, interests, activeMembers] = await Promise.all([
  getRecentEvents(6),
  getRecentAlbums(6),
  getPopularInterests(20),
  getRecentlyActiveMembers(12),
]);
```

### Invalidating Cache

```typescript
import { revalidateEventAttendees, revalidateInterests, revalidateInterest } from '@/app/actions/revalidate';

// After RSVP change
await revalidateEventAttendees();

// After interests are added/removed
await revalidateInterests();
await revalidateInterest('photography');
```

## Further Reading

See individual documentation files for detailed implementation guides and examples.
