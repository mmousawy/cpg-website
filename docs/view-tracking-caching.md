# View Tracking Caching Strategy

## Overview

View counts are tracked client-side and stored in the database. This document outlines the caching strategy for view-related data.

## Caching Strategy

### 1. View Tracking API (`/api/views`)

**No cache invalidation on view tracking** - This is intentional for performance:
- View counts change frequently (every page view)
- Invalidating caches on every view would be expensive
- View counts don't need to be real-time
- Acceptable to have slightly stale counts

### 2. Cache Lifetimes

#### Time-Sensitive Queries (1 hour cache)
- `getMostViewedPhotosLastWeek()` - Uses `cacheLife({ revalidate: 3600 })`
- `getMostViewedAlbumsLastWeek()` - Uses `cacheLife({ revalidate: 3600 })`

**Rationale**: These queries show "most viewed this week" which is time-sensitive and view counts change frequently.

#### Standard Queries (Max cache)
- Detail pages (photo/album) - View counts are server-rendered from cached data
- Account stats - `viewsReceived` can be slightly stale
- Profile stats badges - View counts can be slightly stale
- Popular sorting - Acceptable to be slightly stale

**Rationale**: View counts don't need to be real-time. They update when:
- Cache is invalidated (e.g., when content is updated)
- User refreshes the page
- Cache naturally expires

### 3. Cache Tags

View-related queries use standard cache tags:
- `'gallery'` - For photostream and most viewed photos
- `'albums'` - For album listings and most viewed albums
- `'profile-{nickname}'` - For user-specific data

These tags are invalidated when content is created/updated/deleted, ensuring view counts eventually refresh.

### 4. Query Optimizations

- `getMostViewedPhotosLastWeek()` - Selects only needed columns (not `select('*')`)
- All queries that sort by `view_count` include it in the SELECT clause
- `view_count` added to `getAlbumBySlug()` for detail page display

## When View Counts Update

View counts will be fresh when:
1. Cache is invalidated (content updates trigger revalidation)
2. Cache naturally expires (1 hour for "most viewed" queries)
3. User refreshes the page (for detail pages)

View counts may be slightly stale when:
- Using cached detail pages (acceptable - not real-time requirement)
- Viewing account/profile stats (acceptable - not critical metric)

## Performance Considerations

- View tracking is fire-and-forget (non-blocking)
- No cache invalidation overhead on view tracking
- Shorter cache times only for time-sensitive queries
- Standard queries use max cache for optimal performance
