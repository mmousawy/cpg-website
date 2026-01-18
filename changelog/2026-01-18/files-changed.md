# Files Changed - View Tracking System

## New Files

### Database Migrations
- `supabase/migrations/20260118120000_add_view_count_columns.sql` - Add view_count columns and increment RPC function

### API Routes
- `src/app/api/views/route.ts` - View tracking endpoint with bot detection

### Components
- `src/components/shared/ViewTracker.tsx` - Client component for triggering view tracking
- `src/components/shared/ViewCount.tsx` - Component for displaying view counts with eye icon

### Hooks
- `src/hooks/useViewTracker.ts` - Client-side hook for fire-and-forget view tracking

### Icons
- `public/icons/eye.svg` - Eye icon for view count display

### Documentation
- `docs/view-tracking-caching.md` - Caching strategy documentation for view tracking

## Modified Files

### Gallery
- `src/app/gallery/page.tsx` - Added "Most viewed this week" and "Trending albums" sections, reduced all limits to 10
- `src/lib/data/gallery.ts` - Added getMostViewedPhotosLastWeek function, added short_id to select
- `src/lib/data/albums.ts` - Added getMostViewedAlbumsLastWeek function, added view_count to queries
- `src/app/api/gallery/albums/route.ts` - Added popular sorting support

### Detail Pages
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx` - Added ViewTracker and ViewCount display
- `src/components/photo/PhotoPageContent.tsx` - Added ViewTracker and ViewCount display

### Account & Profile
- `src/hooks/useAccountForm.ts` - Added viewsReceived to AccountStats type
- `src/app/api/account/stats/route.ts` - Added viewsReceived calculation
- `src/components/account/AccountStatsSection.tsx` - Added views received display
- `src/lib/data/profiles.ts` - Added viewsReceived to getProfileStats
- `src/components/shared/ProfileStatsBadges.tsx` - Added views received badge

### Pagination Components
- `src/components/gallery/AlbumsPaginated.tsx` - Added sorting support (Recent/Popular buttons)

### Types
- `src/database.types.ts` - Added view_count columns and increment_view_count RPC function
