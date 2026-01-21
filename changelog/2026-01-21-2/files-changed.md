# Files Changed - Gallery Section Links and Sort Toggle

## Overview

Enhanced the gallery page with section links and added a unified photos/albums browsing experience with Recent/Popular sort toggle.

## Problem Solved

Previously, the gallery overview page showed preview sections but:
1. No easy way to navigate to full listings
2. Trending/most viewed content required separate pages
3. Redundant pages for trending photos/albums duplicated functionality

The new system:
- Makes section titles clickable links to the detail pages
- Adds button links below each section for discoverability
- Uses a single photos/albums page with Recent/Popular toggle
- Links go to the correct sort mode (?sort=popular or default recent)

## Changes Made

### 1. Gallery Overview Page

**File: `src/app/gallery/page.tsx`**

Section titles are now clickable links with hover effect:

```tsx
<Link
  href={`${routes.galleryPhotos.url}?sort=popular`}
  className="group"
>
  <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
    Most viewed this week
  </h2>
</Link>
```

Each section also has a button link below the grid:

```tsx
<Button
  href={`${routes.galleryPhotos.url}?sort=popular`}
  variant="secondary"
>
  View all popular photos
</Button>
```

Section → Link mapping:
- "Most viewed this week" → `/gallery/photos?sort=popular`
- "Trending albums" → `/gallery/albums?sort=popular`
- "Recent photos" → `/gallery/photos`
- "Albums" → `/gallery/albums`

### 2. Photos Page with Sort Toggle

**File: `src/app/gallery/photos/page.tsx`**

Added searchParams support to read sort from URL:

```tsx
type PageProps = {
  searchParams: Promise<{ sort?: string }>;
};

export default async function PhotosPage({ searchParams }: PageProps) {
  const { sort } = await searchParams;
  const initialSort = sort === 'popular' ? 'popular' : 'recent';

  const allPhotos = await getPublicPhotostream(21, initialSort);
  // ...

  return (
    <PhotosPaginated
      initialPhotos={photos}
      perPage={20}
      initialHasMore={hasMore}
      initialSort={initialSort}
    />
  );
}
```

### 3. PhotosPaginated Component

**File: `src/components/gallery/PhotosPaginated.tsx`**

Added Recent/Popular toggle buttons (same pattern as AlbumsPaginated):

```tsx
type PhotosPaginatedProps = {
  initialPhotos: StreamPhoto[];
  perPage?: number;
  initialHasMore?: boolean;
  initialSort?: 'recent' | 'popular';
};

// Toggle buttons
<div className="flex gap-2 mb-6">
  <Button
    variant={sortBy === 'recent' ? 'primary' : 'secondary'}
    onClick={() => handleSortChange('recent')}
    size="sm"
    disabled={isPending}
  >
    Recent
  </Button>
  <Button
    variant={sortBy === 'popular' ? 'primary' : 'secondary'}
    onClick={() => handleSortChange('popular')}
    size="sm"
    disabled={isPending}
  >
    Popular
  </Button>
</div>
```

### 4. Photos API with Sort Support

**File: `src/app/api/gallery/photos/route.ts`**

Added sort parameter support:

```tsx
const sortBy = searchParams.get('sort') === 'popular' ? 'popular' : 'recent';
const orderColumn = sortBy === 'popular' ? 'view_count' : 'created_at';

const { data: photos } = await supabase
  .from('photos')
  .select('*')
  .order(orderColumn, { ascending: false })
  // ...
```

### 5. Albums Page with Sort Support

**File: `src/app/gallery/albums/page.tsx`**

Added searchParams support (already had the toggle):

```tsx
type PageProps = {
  searchParams: Promise<{ sort?: string }>;
};

export default async function AlbumsPage({ searchParams }: PageProps) {
  const { sort } = await searchParams;
  const initialSort = sort === 'popular' ? 'popular' : 'recent';

  const allAlbums = await getPublicAlbums(21, initialSort);
  // ...
}
```

### 6. Route Config Updates

**File: `src/config/routes.ts`**

Updated labels and removed trending routes:

```tsx
galleryPhotos: {
  label: 'Photos',  // was 'Recent Photos'
  url: '/gallery/photos',
},
galleryAlbums: {
  label: 'Albums',  // was 'Photo Albums'
  url: '/gallery/albums',
},
// Removed: galleryTrendingPhotos, galleryTrendingAlbums
```

## Deleted Files

The following redundant files were removed:

- `src/app/gallery/trending-photos/page.tsx`
- `src/app/gallery/trending-albums/page.tsx`
- `src/app/gallery/trending-albums/TrendingAlbumsPaginated.tsx`
- `src/app/api/gallery/trending-photos/route.ts`
- `src/app/api/gallery/trending-albums/route.ts`

## User Experience

### Before
- Gallery overview with no navigation to full listings
- Separate pages needed for trending content
- Confusing page structure

### After
- Click section title or button to see full listing
- Single unified page with Recent/Popular toggle
- Direct links preserve sort context (?sort=popular)
- Consistent UX between photos and albums pages

## Terms & Privacy Page Improvements

### 7. Terms Page Structure

**File: `src/app/terms/page.tsx`**

Restructured to match privacy page layout with consistent styling:

```tsx
<div className="space-y-6 sm:space-y-8 text-sm sm:text-base">
  <div className="prose prose-slate dark:prose-invert max-w-none">
    <h1 className="mb-2 sm:mb-4 text-2xl font-bold sm:text-3xl">
      Terms of Service
    </h1>
    {/* ... */}
  </div>
  <section>
    <h2 className="mb-2 sm:mb-4 text-xl font-semibold sm:text-2xl">
      {/* Section content */}
    </h2>
  </section>
</div>
```

### 8. Privacy Page Responsive Fonts

**File: `src/app/privacy/page.tsx`**

Added responsive font sizes and spacing for better mobile readability:

- Section spacing: `space-y-6 sm:space-y-8`
- Body text: `text-sm sm:text-base`
- h1: `text-2xl sm:text-3xl`
- h2: `text-xl sm:text-2xl`
- h3: `text-lg sm:text-xl`
- Margins: `mb-2 sm:mb-4`

### 9. Footer Client-Side Navigation

**File: `src/components/layout/Footer.tsx`**

Replaced `<a>` tags with Next.js `Link` components for proper client-side navigation:

```tsx
import Link from 'next/link';

// Before
<a href={routes.terms.url}>Terms of Service</a>

// After
<Link href={routes.terms.url}>Terms of Service</Link>
```

This enables soft navigation without full page reloads.

### 10. PhotosPaginated Prop Restoration

**File: `src/components/gallery/PhotosPaginated.tsx`**

Restored `apiEndpoint` and added `showSortToggle` props to support different use cases:

```tsx
type PhotosPaginatedProps = {
  initialPhotos: StreamPhoto[];
  perPage?: number;
  initialHasMore?: boolean;
  initialSort?: 'recent' | 'popular';
  apiEndpoint?: string;      // Custom API endpoint (default: /api/gallery/photos)
  showSortToggle?: boolean;  // Show Recent/Popular toggle (default: true)
};
```

This fixes the recent-likes page which uses a different endpoint and doesn't need sort toggle.

**File: `src/app/gallery/recent-likes/page.tsx`**

Updated to use new props:

```tsx
<PhotosPaginated
  initialPhotos={photos}
  apiEndpoint="/api/gallery/recent-likes"
  perPage={20}
  initialHasMore={hasMore}
  showSortToggle={false}
/>
```

## All Modified Files (10 + 5 deleted)

### Modified
- `src/app/gallery/page.tsx` - Linked titles, button links
- `src/app/gallery/photos/page.tsx` - Sort param support
- `src/app/gallery/albums/page.tsx` - Sort param support
- `src/app/gallery/recent-likes/page.tsx` - Use showSortToggle prop
- `src/components/gallery/PhotosPaginated.tsx` - Recent/Popular toggle, apiEndpoint/showSortToggle props
- `src/app/api/gallery/photos/route.ts` - Sort param support
- `src/config/routes.ts` - Updated labels, removed trending
- `src/app/terms/page.tsx` - Match privacy structure, responsive fonts
- `src/app/privacy/page.tsx` - Responsive fonts and spacing
- `src/components/layout/Footer.tsx` - Use Link for soft navigation

### Deleted
- `src/app/gallery/trending-photos/page.tsx`
- `src/app/gallery/trending-albums/page.tsx`
- `src/app/gallery/trending-albums/TrendingAlbumsPaginated.tsx`
- `src/app/api/gallery/trending-photos/route.ts`
- `src/app/api/gallery/trending-albums/route.ts`
