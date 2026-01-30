# Files Changed - BottomSheet Fixes and Mobile Padding

## Overview

Fixed an issue where the BottomSheet component's fixed overlay was persisting in the DOM even when closed, causing scroll interference on mobile. Also standardized mobile horizontal padding to `px-2` across the app for tighter layouts, and fixed a bug where bulk edit forms were resetting on every parent re-render.

## BottomSheet Conditional Rendering

The BottomSheet was using `fixed inset-0 z-50` for its overlay container, which was always in the DOM even when closed (just hidden with `pointer-events-none` and `translate-y-full`). This caused issues on mobile where the overlay could interfere with page scrolling.

**Solution**: Added conditional rendering with proper animation support:

```tsx
// Track if component should be rendered (delayed unmount for close animation)
const [shouldRender, setShouldRender] = useState(false);
// Track if animation should show open state (delayed to allow mount animation)
const [isAnimatedOpen, setIsAnimatedOpen] = useState(false);

// Handle mount/unmount with animation
useEffect(() => {
  if (isOpen) {
    // First mount the component, then trigger open animation after a frame
    mountTimer = setTimeout(() => {
      setShouldRender(true);
      animationTimer = requestAnimationFrame(() => {
        setIsAnimatedOpen(true);
      });
    }, 0);
  } else {
    // First trigger close animation, then unmount after animation completes
    closeAnimTimer = setTimeout(() => setIsAnimatedOpen(false), 0);
    unmountTimer = setTimeout(() => setShouldRender(false), 300);
  }
}, [isOpen]);

// Don't render anything if not needed
if (!shouldRender) {
  return null;
}
```

The two-state approach (`shouldRender` + `isAnimatedOpen`) ensures:
1. On open: Component mounts with closed styles first, then animates to open
2. On close: Animation plays first, then component unmounts from DOM

## Scroll Lock Cleanup Fix

All modals were setting `document.body.style.overflow = 'auto'` on close, which forces a value instead of restoring the original. Changed to empty string to properly reset:

```tsx
// Before
document.body.style.overflow = 'auto';

// After
document.body.style.overflow = '';
```

Applied to: BottomSheet, Modal, SearchModal

## Mobile Padding Consistency

Reduced horizontal padding from `px-4` to `px-2` on mobile for tighter layouts. The main change is in PageContainer's shared constants:

```tsx
// Before
export const pagePadding = 'px-4 py-6 md:p-12 md:pb-14';
export const pagePaddingAlt = 'px-4 pb-5 pt-4 md:p-10 md:pt-8';

// After
export const pagePadding = 'px-2 py-6 md:p-12 md:pb-14';
export const pagePaddingAlt = 'px-2 pb-5 pt-4 md:p-10 md:pt-8';
```

Also applied to: Header, Footer, StickyActionBar, MobileActionBar, home page hero, events page hero, admin members page, album detail mobile bar, activities slider noscript fallback.

## Bulk Edit Form Reset Fix

The bulk edit forms (BulkPhotoEditForm, BulkAlbumEditForm) were resetting on every parent re-render because `selectedPhotos`/`selectedAlbums` arrays were in the useEffect dependency array. Since arrays are compared by reference, any parent re-render would trigger a form reset.

**Solution**: Memoize a stable key based on IDs and only depend on that:

```tsx
// Memoize IDs string for dependency - only reset form when actual selection changes
const photoIdsKey = useMemo(() => selectedPhotos.map((p) => p.id).join(','), [selectedPhotos]);

// Only depend on photoIdsKey to avoid resetting on every parent re-render
useEffect(() => {
  // ... reset form
}, [photoIdsKey, reset]); // Not selectedPhotos
```

## StickyActionBar Shadow Fix

Added `pointer-events-none` to the gradient shadow overlay so it doesn't block clicks on elements behind it.

## All Modified Files

- `src/components/shared/BottomSheet.tsx` - Conditional rendering, animation states
- `src/components/shared/Modal.tsx` - Scroll lock cleanup
- `src/components/search/SearchModal.tsx` - Scroll lock cleanup
- `src/components/layout/PageContainer.tsx` - Mobile padding constants
- `src/components/layout/Header.tsx` - Mobile padding, search button styling
- `src/components/layout/Footer.tsx` - Mobile padding
- `src/components/shared/StickyActionBar.tsx` - Mobile padding, pointer-events fix
- `src/components/manage/MobileActionBar.tsx` - Mobile padding
- `src/components/manage/BulkPhotoEditForm.tsx` - Form reset fix
- `src/components/manage/BulkAlbumEditForm.tsx` - Form reset fix
- `src/app/page.tsx` - Mobile padding
- `src/app/events/[eventSlug]/page.tsx` - Mobile padding
- `src/app/admin/members/page.tsx` - Mobile padding
- `src/app/account/(manage)/albums/[slug]/AlbumDetailClient.tsx` - Mobile padding
- `src/components/shared/ActivitiesSlider.tsx` - Mobile padding (noscript)
