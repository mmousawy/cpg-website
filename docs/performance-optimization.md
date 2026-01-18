# Performance Optimization Guide

This guide covers performance best practices, lazy loading patterns, and bundle analysis workflows for the CPG website.

## Table of Contents

- [Bundle Analysis](#bundle-analysis)
- [Lazy Loading Patterns](#lazy-loading-patterns)
- [Image Optimization](#image-optimization)
- [Code Splitting](#code-splitting)
- [Performance Monitoring](#performance-monitoring)

---

## Bundle Analysis

### When to Analyze

Run bundle analysis when:
- Adding new dependencies
- Investigating slow page loads
- Before major releases
- Quarterly performance audits

### Running the Analyzer

```bash
# Analyze bundle (uses webpack, opens browser report)
npm run analyze
```

This generates an interactive treemap showing:
- Bundle composition
- Dependency sizes
- Code splitting chunks

### Interpreting Results

Look for:
- **Large dependencies** (>50 KiB) - candidates for lazy loading
- **Duplicate code** - shared chunks not properly extracted
- **Unused exports** - tree-shaking opportunities

### Current Optimizations

| Library | Size | Status | Location |
|---------|------|--------|----------|
| PhotoSwipe | ~25 KiB | Lazy loaded | `src/utils/photoswipe.ts` |
| @dnd-kit | ~40 KiB | Lazy loaded | `LazySelectableGrid.tsx` |
| exifr | ~15 KiB | Dynamic import | Admin/upload pages |
| Swiper | ~30 KiB | Lazy loaded | `ActivitiesSliderWrapper.tsx` |

---

## Lazy Loading Patterns

### Pattern 1: Utility Lazy Loader (PhotoSwipe)

For libraries initialized in multiple components:

```typescript
// src/utils/photoswipe.ts
let PhotoSwipeLightboxModule: typeof import('photoswipe/lightbox') | null = null;
let stylesLoaded = false;

export async function initPhotoSwipe() {
  if (!stylesLoaded) {
    // @ts-expect-error - CSS imports don't have type declarations
    await import('photoswipe/style.css');
    stylesLoaded = true;
  }

  if (!PhotoSwipeLightboxModule) {
    PhotoSwipeLightboxModule = await import('photoswipe/lightbox');
  }

  return PhotoSwipeLightboxModule.default;
}

export type PhotoSwipeLightboxInstance = InstanceType<Awaited<ReturnType<typeof initPhotoSwipe>>>;
```

**Usage in components:**

```typescript
import { initPhotoSwipe, type PhotoSwipeLightboxInstance } from '@/utils/photoswipe';

useEffect(() => {
  let lightbox: PhotoSwipeLightboxInstance | null = null;

  initPhotoSwipe().then((PhotoSwipeLightbox) => {
    lightbox = new PhotoSwipeLightbox({...});
    lightbox.init();
  });

  return () => lightbox?.destroy();
}, []);
```

### Pattern 2: Dynamic Component (next/dynamic)

For components with heavy dependencies:

```typescript
// src/components/manage/LazySelectableGrid.tsx
'use client';

import dynamic from 'next/dynamic';
import type SelectableGridComponent from './SelectableGrid';

const LazySelectableGrid = dynamic(
  () => import('./SelectableGrid'),
  {
    ssr: false, // Required for browser-only APIs
  }
) as typeof SelectableGridComponent;

export default LazySelectableGrid;
```

### Pattern 3: Inline Dynamic Import

For one-off usage:

```typescript
// Only load when needed
const handleUpload = async (file: File) => {
  const exifr = (await import('exifr')).default;
  const exifData = await exifr.parse(file, {
    pick: ['Make', 'Model', 'DateTimeOriginal', ...],
  });
};
```

### When to Use Each Pattern

| Pattern | Use When |
|---------|----------|
| Utility loader | Library used in 3+ components |
| Dynamic component | Component has heavy deps, used in few places |
| Inline import | One-off usage, triggered by user action |

---

## Image Optimization

### Next.js Image Configuration

```typescript
// next.config.ts
images: {
  formats: ['image/avif', 'image/webp'], // Modern formats (30% smaller)
  qualities: [25, 50, 75, 85, 95],        // Quality presets
}
```

### Image Component Best Practices

```tsx
// LCP-critical images (hero, above-fold)
<Image
  src={heroImage}
  priority
  fetchPriority="high"
  sizes="100vw"
  quality={85}
/>

// Below-fold images
<Image
  src={photo.url}
  loading="lazy"
  sizes="(max-width: 640px) 100vw, 50vw"
  quality={75}
/>

// Thumbnails
<Image
  src={thumbnail}
  sizes="128px"
  quality={50}
/>
```

### Sizing Guidelines

| Image Type | `sizes` Value | `quality` |
|------------|---------------|-----------|
| Hero/banner | `100vw` | 85 |
| Gallery photo | `(max-width: 640px) 100vw, 50vw` | 75-85 |
| Card thumbnail | `256px` or calculated | 50-75 |
| Avatar | `96px` or `100px` | 85-95 |

---

## Code Splitting

### Route-based Splitting (Automatic)

Next.js automatically code-splits by route. Each page only loads its dependencies.

### Component-based Splitting

Use `next/dynamic` for heavy components:

```typescript
const HeavyEditor = dynamic(() => import('./HeavyEditor'), {
  loading: () => <EditorSkeleton />,
  ssr: false,
});
```

### Verifying Code Splitting

1. Run `npm run analyze`
2. Check that lazy-loaded modules are in separate chunks
3. Verify chunk sizes are reasonable (<100 KiB per chunk)

---

## Performance Monitoring

### Lighthouse Audits

Run periodically on key pages:

```bash
# Using Chrome DevTools
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Run audit on:
   - Homepage (/)
   - Profile page (/@username)
   - Gallery (/gallery)
   - Event page (/events/[slug])
```

### Key Metrics to Track

| Metric | Target | Description |
|--------|--------|-------------|
| LCP | < 2.5s | Largest Contentful Paint |
| FCP | < 1.8s | First Contentful Paint |
| TTI | < 3.8s | Time to Interactive |
| TBT | < 200ms | Total Blocking Time |
| CLS | < 0.1 | Cumulative Layout Shift |

### Vercel Analytics

Production metrics are tracked via `@vercel/analytics`. View in Vercel Dashboard → Analytics.

---

## Checklist for New Dependencies

Before adding a new dependency:

1. [ ] Check bundle size: `npx bundlephobia <package-name>`
2. [ ] Consider if it can be lazy loaded
3. [ ] Check for lighter alternatives
4. [ ] Run `npm run analyze` after adding

### Size Guidelines

| Size | Action |
|------|--------|
| < 10 KiB | OK to import directly |
| 10-30 KiB | Consider lazy loading if not critical |
| > 30 KiB | Must lazy load or find alternative |

---

## Quick Commands

```bash
# Build and check for errors
npm run build

# Analyze bundle
npm run analyze

# Type check
npx tsc --noEmit

# Run dev server
npm run dev
```

---

## Related Documentation

- [Revalidation System](./revalidation-system.md) - Caching strategy
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Next.js Bundle Analyzer](https://nextjs.org/docs/app/guides/package-bundling)
