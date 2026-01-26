# Files Changed - Global Search Feature & Notification Sound Effects

## Overview

Added a global search feature that searches across albums, photos, members, events, and tags using PostgreSQL full-text search. Accessible via a modal triggered by ⌘K (Mac) or Ctrl+K (Windows/Linux), with keyboard navigation and results styled to match existing card components.

Also added sound effects for incoming notifications with intelligent debouncing to prevent audio spam during notification bursts.

## Database: Full-Text Search

### PostgreSQL FTS Setup

**File: `supabase/migrations/20260125000000_add_global_search.sql`**

Added `tsvector` columns with weighted ranking to searchable tables:

```sql
-- Profiles: full_name and nickname get highest weight
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(nickname, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(bio, '')), 'B')
  ) STORED;

-- GIN indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_search ON profiles USING GIN(search_vector);
```

### Unified Search RPC

Created `global_search` function that:
- Searches across all entity types in a single query
- Returns ranked results with entity metadata
- Respects visibility rules (is_public, deleted_at, suspended_at)
- Uses prefix matching for tags (e.g., "nat" matches "nature")

```sql
CREATE OR REPLACE FUNCTION public.global_search(
  search_query text,
  result_limit int DEFAULT 20,
  search_types text[] DEFAULT ARRAY['albums', 'photos', 'members', 'events', 'tags']
)
RETURNS TABLE(
  entity_type text,
  entity_id text,
  title text,
  subtitle text,
  image_url text,
  url text,
  rank real
)
```

**Special handling:**
- Albums: Subtitle shows photo count ("12 photos")
- Events: Uses `COALESCE(NULLIF(cover_image, ''), NULLIF(image_url, ''))` to match EventImage component logic
- Tags: Shows photo count and uses prefix matching

## Search UI Components

### SearchModal

**File: `src/components/search/SearchModal.tsx`**

Modal component with:
- Focus trap for accessibility
- Keyboard navigation (↑↓ arrows, Enter to select, Esc to close)
- Selected item tracking with visual highlight
- Responsive footer (hidden on mobile)

```typescript
// Handle keyboard shortcuts
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setSelectedIndex((prev) => prev < results.length - 1 ? prev + 1 : prev);
      break;
    case 'Enter':
      if (selectedIndex >= 0) {
        navigateToResult(selectedIndex);
      }
      break;
  }
};
```

### SearchResultItem

**File: `src/components/search/SearchResultItem.tsx`**

Entity-specific styling to match existing cards:
- **Members**: Uses `Avatar` component like MemberCard
- **Albums**: Matches `AlbumMiniCard` with square thumbnail
- **Photos**: Square thumbnail with hover brightness effect
- **Events**: 4:3 thumbnail with calendar icon fallback
- **Tags**: Tag icon with photo count

Each result type has selected state styling:
```typescript
className={clsx(
  'group flex items-center gap-3 rounded-lg border p-3 transition-colors',
  isSelected
    ? 'border-primary bg-background'
    : 'border-border-color bg-background-light hover:border-primary hover:bg-background',
)}
```

## Search Hook with Debouncing

**File: `src/hooks/useSearch.ts`**

**Problem:** Loading state flickered because:
1. `isPendingSearch` (query !== debouncedQuery) would become false
2. But `isLoading` (fetch in progress) wasn't true yet
3. Brief moment where neither was true = flicker

**Solution:** Track `lastSearchedQuery` to know when we're waiting for results:

```typescript
// Loading if:
// 1. Query is pending debounce (user is typing)
// 2. OR: debouncedQuery is valid but we haven't got results for it yet
const isPendingDebounce = query.trim().length >= minQueryLength && query !== debouncedQuery;
const isWaitingForResults = debouncedQuery.trim().length >= minQueryLength && debouncedQuery !== lastSearchedQuery;
const isLoading = isPendingDebounce || isWaitingForResults;
```

Also uses AbortController to cancel pending requests when query changes.

## Header Integration

**File: `src/components/layout/Header.tsx`**

Added search button with OS-aware keyboard shortcut display:

```typescript
// Detect Mac vs other OS for keyboard shortcut display
const isMac = useMemo(() => {
  if (!mounted) return true; // Default to Mac symbol for SSR
  return navigator.platform.toLowerCase().includes('mac');
}, [mounted]);
```

Displays `⌘K` on Mac, `Ctrl K` on Windows/Linux.

Global keyboard shortcut listener:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setSearchOpen(true);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

## Cache Invalidation

**File: `src/app/actions/revalidate.ts`**

Added `revalidateTag('search', 'max')` to existing revalidation functions so search results are invalidated when content changes:

- `revalidateEvent()` - when events change
- `revalidateAlbum()` - when albums change
- `revalidateGallery()` - when photos change
- `revalidateProfiles()` - when profiles change
- `revalidateAll()` - full invalidation

Also added dedicated `revalidateSearch()` function.

## All Modified Files (14 total)

### New Files (10)
- `supabase/migrations/20260125000000_add_global_search.sql` - FTS columns, indexes, and RPC function
- `src/types/search.ts` - SearchResult and SearchEntityType types
- `src/lib/data/search.ts` - Cached searchEntities function
- `src/app/api/search/route.ts` - GET endpoint with query/types/limit params
- `src/hooks/useSearch.ts` - Search state management with debouncing
- `src/hooks/useDebounce.ts` - Generic debounce hook
- `src/components/search/SearchModal.tsx` - Modal with keyboard navigation
- `src/components/search/SearchInput.tsx` - Input with search icon and clear button
- `src/components/search/SearchResults.tsx` - Grouped results with loading skeleton
- `src/components/search/SearchResultItem.tsx` - Entity-specific result rendering

### Modified Files (4)
- `src/components/layout/Header.tsx` - Search button, modal, and ⌘K shortcut
- `src/app/actions/revalidate.ts` - Add search cache invalidation
- `src/lib/data/index.ts` - Export search functions
- `src/hooks/useRealtimeNotifications.tsx` - Add notification sound effects with debouncing

## Notification Sound Effects

**File: `src/hooks/useRealtimeNotifications.tsx`**

Added audio feedback for incoming notifications:

### Sound Playback
- Plays `/cpg-notification.mp3` when a notification arrives via Supabase Realtime
- Volume set to 70% to avoid being too loud
- Gracefully handles browser autoplay restrictions (fails silently if audio can't play)

### Debouncing Logic
To prevent audio spam when multiple notifications arrive quickly:
- Tracks the last time the sound was played
- Only plays sound if more than 3 seconds have passed since the last play
- If multiple notifications arrive within 3 seconds, only the first one triggers the sound
- Subsequent notifications are silently ignored until the 3-second window expires

```typescript
// Track last sound play time to debounce sound effects
let lastSoundPlayTime = 0;
const NOTIFICATION_SOUND_WINDOW_MS = 3000; // 3 seconds

function handleNotificationSound(): void {
  const now = Date.now();
  
  // Only play if more than 3 seconds have passed since last sound
  if (now - lastSoundPlayTime < NOTIFICATION_SOUND_WINDOW_MS) {
    return;
  }
  
  lastSoundPlayTime = now;
  // Play sound...
}
```

This ensures users aren't overwhelmed by sound effects during notification bursts (e.g., when multiple people like a photo simultaneously), while still providing audio feedback for individual notifications.

## Testing

### Search Functionality
1. Press ⌘K (Mac) or Ctrl+K (Windows) to open search
2. Type at least 2 characters to trigger search
3. Verify results are grouped by type (Members, Albums, Photos, Events, Tags)
4. Use ↑↓ arrows to navigate, Enter to select
5. Click a result or press Enter to navigate

### Loading States
1. Type quickly and verify no flicker between skeleton and results
2. Verify skeleton shows immediately when typing
3. Verify "No results found" only shows after search completes with no matches

### Keyboard Navigation
1. Verify selected item has primary border highlight
2. Verify arrows wrap correctly at top/bottom
3. Verify Esc closes the modal
4. Verify clicking outside closes the modal
