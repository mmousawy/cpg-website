# Files Changed - Changelog Detail Pages, View Tracking & Layout Improvements

## Overview

This update adds several features: detailed changelog pages that render the full `files-changed.md` content for each release, timestamped view tracking to power accurate "most viewed this week" queries, and improvements to the justified photo grid layout algorithm to prevent repetitive visual patterns.

---

## Changelog Detail Pages

### The Feature

Added a new route at `/changelog/[slug]` that renders the full `files-changed.md` markdown file for each changelog entry. The overview page now links to these detail pages and shows all versions in a table.

### Implementation

**New route: `src/app/changelog/[slug]/page.tsx`**

- Uses `react-markdown` to render the markdown content with custom styled components
- Shows version badge, date slug, and commit summary in the header
- Custom component overrides for consistent styling (headings with borders, styled code blocks, etc.)
- `generateStaticParams` pre-renders all existing changelog folders

**New library: `src/lib/changelog.ts`**

Helper functions for reading changelog data:

```typescript
// Get all changelog folder slugs, sorted newest-first
export async function getChangelogSlugs(): Promise<string[]>

// Get all slugs matching a date (handles -1, -2, -3 suffixes)
export function getSlugsForDate(slugs: string[], date: string): string[]

// Read files-changed.md content
export async function getChangelogDetailMarkdown(slug: string): Promise<string | null>

// Read first line of commit-message.txt
export async function getChangelogCommitSummary(slug: string): Promise<string | null>

// Map slug to version from CHANGELOG.md
export async function getVersionForSlug(slug: string): Promise<string | null>
```

**Updated overview: `src/app/changelog/page.tsx`**

- Builds bidirectional mappings between versions and slugs based on dates
- Shows "Read all changes" link only for versions with corresponding folders
- Bottom section now shows a table with Version, Date, and Description columns
- Versions without detail pages are shown as greyed-out text

---

## Timestamped View Tracking

### The Problem

The "most viewed this week" query was using total `view_count` filtered by `created_at` - showing recently created photos with high view counts, not photos that received the most views in the last 7 days.

### The Solution

**New tables: `photo_views` and `album_views`**

```sql
CREATE TABLE "public"."photo_views" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "photo_id" uuid NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for efficient weekly queries
CREATE INDEX "idx_photo_views_photo_viewed_at" 
  ON "public"."photo_views" ("photo_id", "viewed_at" DESC);
```

**Updated RPC: `increment_view_count`**

Now logs individual view events in addition to incrementing the total:

```sql
IF p_entity_type = 'photo' THEN
  -- Increment total view count
  UPDATE photos SET view_count = view_count + 1 WHERE id = p_entity_id;
  -- Log individual view with timestamp
  INSERT INTO photo_views (photo_id, viewed_at) VALUES (p_entity_id, NOW());
```

**Updated query: `getMostViewedPhotosLastWeek`**

```typescript
// Count views from photo_views table in last 7 days
const { data: viewCounts } = await supabase
  .from('photo_views')
  .select('photo_id')
  .gte('viewed_at', oneWeekAgoISO);

// Count views per photo
const photoViewMap = new Map<string, number>();
for (const view of viewCounts) {
  const count = photoViewMap.get(view.photo_id) || 0;
  photoViewMap.set(view.photo_id, count + 1);
}

// Sort by view count and fetch top photos
const topPhotoIds = Array.from(photoViewMap.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, limit)
  .map(([photoId]) => photoId);
```

---

## Justified Layout Variety Penalty

### The Problem

The justified layout algorithm could produce repetitive row patterns, like three consecutive rows of portrait-landscape-landscape (PLL, PLL, PLL), which looks visually monotonous.

### The Solution

Added a "variety penalty" to the dynamic programming cost function:

```typescript
// Get shape signature: P=portrait, S=square, L=landscape
function getRowSignature(photos: PhotoData[]): string {
  return photos.map((p) => {
    if (p.aspectRatio < 0.85) return 'P';
    if (p.aspectRatio > 1.15) return 'L';
    return 'S';
  }).join('');
}

// In the DP loop:
let varietyPenalty = 0;
if (prevSignature === rowSignature) {
  // Heavy penalty for identical patterns (e.g., PLL followed by PLL)
  varietyPenalty = 150;
} else if (prevSignature.length === rowSignature.length) {
  // Light penalty for same length but different pattern
  varietyPenalty = 20;
}
```

This encourages the algorithm to vary row compositions, creating more visually interesting layouts.

---

## PhotosPaginated Batching

### The Problem

When loading more photos, adding them to a flat array caused the justified layout to recalculate for all photos, shifting existing row compositions.

### The Solution

Store photos in batches, each with its own stable layout:

```typescript
type PhotoBatch = {
  id: string;
  photos: StreamPhoto[];
};

const [batches, setBatches] = useState<PhotoBatch[]>([
  { id: 'initial', photos: initialPhotos },
]);

// When loading more:
setBatches(prev => [
  ...prev,
  { id: `batch-${prev.length}`, photos: data.photos },
]);
```

Each batch renders its own `JustifiedPhotoGrid`, maintaining stable layouts for previously loaded photos.

---

## All Modified Files

New:
- `src/app/changelog/[slug]/page.tsx` - Changelog detail page
- `src/lib/changelog.ts` - Changelog helper functions
- `supabase/migrations/20260131000000_add_view_tracking.sql` - View tracking tables
- `supabase/migrations/20260131000001_add_view_tracking_select_policies.sql` - RLS policies

Modified:
- `src/app/changelog/page.tsx` - Version-slug mappings, table layout
- `src/lib/data/gallery.ts` - Weekly views query
- `src/components/gallery/PhotosPaginated.tsx` - Batch-based photo storage
- `src/components/photo/JustifiedPhotoGrid.tsx` - Layout calculation ordering
- `src/utils/justifiedLayout.ts` - Variety penalty algorithm
- `package.json` - Added react-markdown dependency
