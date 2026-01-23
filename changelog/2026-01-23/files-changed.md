# Files Changed - Database Optimization with RPC Functions

## Overview

Optimized database queries by introducing RPC functions that consolidate multiple queries into single calls. Reduced account stats from 15+ queries to 1 RPC call and profile stats from 12+ queries to 1 RPC call. Normalized the album_photos table by removing redundant columns and consolidated old migrations into the baseline migration.

## Database Optimizations

### 1. Stats RPC Functions

**File: `supabase/migrations/20260123000001_add_stats_rpcs.sql`**

Created two optimized RPC functions:

**`get_user_stats(p_user_id uuid)`**
- Returns all account stats in a single query
- Uses SECURITY DEFINER to access data regardless of RLS
- Replaces 15+ individual queries with one RPC call
- Returns JSONB with: albums, photos, commentsMade, commentsReceived, likesReceived, likesMade, viewsReceived, rsvpsConfirmed, rsvpsCanceled, eventsAttended, memberSince, lastLoggedIn

**`get_profile_stats(p_user_id uuid)`**
- Returns public profile stats in a single query
- Uses SECURITY INVOKER so RLS applies normally
- Replaces 12+ individual queries with one RPC call
- Returns JSONB with: eventsAttended, commentsMade, likesReceived, viewsReceived

**Benefits:**
- Massive reduction in database round trips
- Better query planning and execution by database
- Single transaction instead of multiple
- Reduced latency for stats endpoints

### 2. Album Photos Normalization

**File: `supabase/migrations/20260123000000_normalize_album_photos.sql`**

Normalized the `album_photos` table by removing redundant columns:

**Changes:**
- Updated `album_photos_active` view to get width/height from `photos` table instead of redundant `album_photos` columns
- Removed DEFAULT 0 from `sort_order` to allow auto-assign trigger to work
- Updated `add_photos_to_album` function to stop writing redundant width/height columns
- Updated `update_album_cover` trigger to use `photos.url` instead of redundant `album_photos.photo_url`
- Removed redundant FK constraint `fk_album_photos_photo_url`
- Removed redundant unique constraint `album_photos_unique_photo`

**Why:**
- `width` and `height` were redundant copies of `photos.width` and `photos.height`
- `photo_url` was redundant since we have `photo_id` FK
- Redundant data increases storage and maintenance burden
- Single source of truth improves data consistency

**Note:** Phase 1 only updates views/functions. Phase 2 (future) will drop the redundant columns after code is updated.

### 3. Migration Consolidation

**File: `supabase/migrations/00000000000000_baseline.sql`**

Consolidated old migrations into baseline:
- Merged deleted migrations into baseline migration
- Removed separate migration files that were already applied
- Cleaner migration history

**Deleted migrations consolidated:**
- `20260116163348_add_event_reminder_columns.sql`
- `20260117000000_add_photo_album_likes.sql`
- `20260117100000_add_likes_count_columns.sql`
- `20260118060520_fix_likes_count_functions_search_path.sql`
- `20260118120000_add_view_count_columns.sql`
- `20260119000000_create_notifications.sql`
- `20260119000001_optimize_notifications_rls.sql`
- `20260119000002_add_notifications_dismissed.sql`
- `20260119100000_add_weekly_digest_email_type.sql`
- `20260121170000_add_terms_accepted_at.sql`
- `temp_migrations/create_event_comments.sql`
- `temp_migrations/create_interests_system.sql`
- `temp_migrations/create_shared_tags_system.sql`

### 4. Events RSVPs FK Fix

Fixed dual foreign key issue:
- `events_rsvps.user_id` had two FKs: one to `auth.users`, one to `profiles`
- Since `profiles.id` already FKs to `auth.users.id`, the `auth.users` FK was redundant
- Removed redundant `events_rsvps_user_id_fkey` constraint

## API Route Optimizations

### Account Stats API

**File: `src/app/api/account/stats/route.ts`**

**Before:** 330+ lines with 15+ individual queries
```typescript
// Multiple queries for albums, photos, comments, likes, views, RSVPs, etc.
const { data: albums } = await supabase.from('albums').select('id')...
const { data: photos } = await supabase.from('photos').select('id')...
// ... 13+ more queries
```

**After:** 52 lines with 1 RPC call
```typescript
const { data: stats, error } = await supabase.rpc('get_user_stats', {
  p_user_id: user.id,
});
return NextResponse.json(stats as unknown as UserStats);
```

**Impact:** Reduced from 15+ database round trips to 1, significantly improving response time.

### Comments API

**File: `src/app/api/comments/route.ts`**

Simplified query patterns and removed redundant logic.

### Weekly Digest Cron

**File: `src/app/api/cron/weekly-digest/route.ts`**

Optimized queries for better performance in batch processing.

## Data Layer Optimizations

### Profile Stats

**File: `src/lib/data/profiles.ts`**

**Before:** 12+ individual queries
```typescript
// Get events attended
const { data: rsvpsData } = await supabase.from('events_rsvps')...
// Get comments made
const { count } = await supabase.from('comments')...
// ... 10+ more queries
```

**After:** 1 RPC call
```typescript
const { data: dbStats, error } = await supabase.rpc('get_profile_stats', {
  p_user_id: userId,
});
```

**Impact:** Reduced from 12+ queries to 1 RPC call.

### Random Interests with Members

**File: `src/lib/data/members.ts`**

**Before:** 2*N queries (one per interest)
```typescript
for (const interest of selectedInterests) {
  const { data: profileInterests } = await supabase
    .from('profile_interests')
    .select('profile_id')
    .eq('interest', interest.name)...
}
```

**After:** 3 bulk queries total
```typescript
// Bulk fetch all profile_interests for selected interests (1 query instead of N)
const { data: allProfileInterests } = await supabase
  .from('profile_interests')
  .select('profile_id, interest')
  .in('interest', interestNames);
// Then group and fetch profiles in bulk
```

**Impact:** Reduced from 2*N queries to 3 queries total, regardless of interest count.

## All Modified Files (15 total)

### New Files (2)
- `supabase/migrations/20260123000000_normalize_album_photos.sql` - Album photos normalization
- `supabase/migrations/20260123000001_add_stats_rpcs.sql` - Stats RPC functions

### Modified Files (13)
- `supabase/migrations/00000000000000_baseline.sql` - Consolidated old migrations
- `src/app/api/account/stats/route.ts` - Refactored to use get_user_stats RPC (330+ lines → 52 lines)
- `src/app/api/comments/route.ts` - Simplified query patterns
- `src/app/api/cron/weekly-digest/route.ts` - Optimized queries
- `src/components/account/AccountStatsSection.tsx` - Updated for new stats structure
- `src/database.types.ts` - Updated types for RPC functions
- `src/hooks/usePhotoUpload.ts` - Updated for schema changes
- `src/lib/data/members.ts` - Optimized getRandomInterestsWithMembers with bulk queries
- `src/lib/data/profiles.ts` - Simplified getProfileStats to use RPC (190+ lines → 44 lines)
- `src/utils/uploadPhoto.ts` - Updated for schema changes
- `.cursorrules` - Moved to `.cursor/.cursorrules`

## Performance Impact

- **Account stats endpoint:** 15+ queries → 1 RPC call (~93% reduction)
- **Profile stats function:** 12+ queries → 1 RPC call (~92% reduction)
- **Random interests function:** 2*N queries → 3 queries (scales with N)
- **Database normalization:** Reduced redundant data storage and maintenance

## Migration Notes

- Phase 1 migrations are backward compatible (views/functions updated, columns not dropped yet)
- Phase 2 will drop redundant columns after code is fully updated
- Old migrations consolidated into baseline for cleaner history
- RPC functions use appropriate security contexts (DEFINER for account stats, INVOKER for profile stats)
