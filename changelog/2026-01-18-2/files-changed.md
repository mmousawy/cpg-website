# Files Changed - Performance & CI/CD

## New Files

### Components
- `src/components/shared/HeroImage.tsx` - Optimized hero image with LCP priority settings
- `src/components/manage/LazySelectableGrid.tsx` - Lazy wrapper for @dnd-kit components

### Utilities
- `src/utils/photoswipe.ts` - Lazy loader for PhotoSwipe lightbox

### SEO
- `src/app/sitemap.ts` - Dynamic sitemap generation
- `src/app/robots.ts` - Robots.txt configuration

### CI/CD
- `.husky/pre-commit` - Pre-commit hooks (lint, typecheck, tests)

### Documentation
- `docs/performance-optimization.md` - Performance best practices guide

## Modified Files

### Configuration
- `next.config.ts` - Added security headers, CSS optimization, AVIF/WebP formats, bundle analyzer
- `package.json` - Added scripts (analyze, typecheck, test:run, lint:fix), husky, lint-staged, cross-env

### Components (Lazy Loading)
- `src/components/photo/PhotoWithLightbox.tsx` - Use lazy PhotoSwipe loader
- `src/components/manage/PhotoListItem.tsx` - Use lazy PhotoSwipe loader
- `src/components/photo/FullSizeGalleryButton.tsx` - Use lazy PhotoSwipe loader
- `src/components/shared/ClickableAvatar.tsx` - Use lazy PhotoSwipe loader
- `src/components/manage/PhotoGrid.tsx` - Use LazySelectableGrid
- `src/components/manage/AlbumGrid.tsx` - Use LazySelectableGrid
- `src/app/admin/events/[eventId]/page.tsx` - Inline dynamic import for exifr

### Accessibility
- `src/components/layout/Footer.tsx` - Add aria-labels to social buttons
- `src/components/photo/JustifiedPhotoGrid.tsx` - Add aria-labels to photo links
- `src/components/events/EventCard.tsx` - Fix color contrast on upcoming badge

### Pages
- `src/app/page.tsx` - Server-side hero image selection, HeroImage component
- `src/app/members/page.tsx` - Add Suspense boundaries for streaming

### CI/CD
- `.github/workflows/ci.yml` - Add lint-and-typecheck job before tests

### Documentation
- `README.md` - Add pre-commit hooks and CI pipeline docs
- `docs/README.md` - Add link to performance guide
