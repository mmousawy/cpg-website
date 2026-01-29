# Files Changed - BlurImage Aspect Ratio Fixes, BottomSheet Titles & Image Cropping

## Overview

Several improvements to the image loading experience and mobile UI:

1. **BlurImage aspect ratio fixes**: The blur placeholder was showing as a square for non-square images, and sometimes overflowing its container. Fixed by decoding blurhash with the correct aspect ratio and using a background-image div that matches the container size.

2. **Blurhash generation improvements**: The blurhash was being generated from a 32x32 square crop, losing aspect ratio information. Updated to preserve the original aspect ratio during encoding.

3. **BottomSheet title integration**: Mobile edit sheets now show the title ("Edit photo", "Edit 3 photos", etc.) in the BottomSheet header next to the close button, instead of inside the scrollable content.

4. **Server-side image cropping**: Added helpers for requesting square or aspect-ratio cropped thumbnails from Supabase, and capped image requests at 2x display width to prevent oversized images.

---

## BlurImage Aspect Ratio Fix

### The Problem

The `BlurImage` component had several issues with sized images (non-fill layout):

1. Blurhash was always decoded to 64x64 (square), regardless of image aspect ratio
2. The blur placeholder div didn't match the container size
3. CSS like `h-34` on the main image wasn't being respected by the blur placeholder
4. The blur was overflowing the container

### The Solution

**File: `src/components/shared/BlurImage.tsx`**

For sized images, now uses the image dimensions to:

1. **Decode blurhash with correct aspect ratio**:

```typescript
// Calculate decode dimensions maintaining aspect ratio (max 64px on longest side)
let decodeWidth = 64;
let decodeHeight = 64;
if (imgWidth && imgHeight && imgWidth > 0 && imgHeight > 0) {
  if (imgWidth > imgHeight) {
    decodeWidth = 64;
    decodeHeight = Math.round((imgHeight / imgWidth) * 64);
  } else {
    decodeHeight = 64;
    decodeWidth = Math.round((imgWidth / imgHeight) * 64);
  }
}
return blurhashToDataURL(blurhash, decodeWidth, decodeHeight);
```

2. **Use background-image div for blur placeholder**:

```typescript
// Container sets aspect ratio, blur fills it
<span
  className="relative inline-block overflow-hidden"
  style={{ width: '100%', aspectRatio: `${imgWidth} / ${imgHeight}` }}
>
  <div
    className="blur-md w-full"
    style={{
      backgroundImage: `url(${blurhashDataUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      aspectRatio: `${imgWidth} / ${imgHeight}`,
    }}
  />
  <Image src={src} className="absolute inset-0 w-full h-full object-cover" />
</span>
```

---

## Blurhash Generation Improvements

### The Problem

Both client-side and server-side blurhash generation were forcing images to 32x32 squares:

- Client: `ctx.drawImage(img, 0, 0, 32, 32)` - stretches/squashes to square
- Server: `.resize(32, 32, { fit: 'cover' })` - center-crops to square

This meant the blurhash represented a distorted or cropped version of the image.

### The Solution

**File: `src/utils/generateBlurhash.ts`** (client-side)

```typescript
// Calculate dimensions preserving aspect ratio (max 32px on longest side)
const maxSize = 32;
let width: number;
let height: number;
if (img.naturalWidth > img.naturalHeight) {
  width = maxSize;
  height = Math.round((img.naturalHeight / img.naturalWidth) * maxSize);
} else {
  height = maxSize;
  width = Math.round((img.naturalWidth / img.naturalHeight) * maxSize);
}
```

**File: `scripts/generate-event-blurhash.ts`** (server-side)

```typescript
// Get original dimensions to preserve aspect ratio
const metadata = await sharp(imageBuffer).metadata();
const originalWidth = metadata.width || 32;
const originalHeight = metadata.height || 32;

// Calculate dimensions preserving aspect ratio
if (originalWidth > originalHeight) {
  width = maxSize;
  height = Math.max(1, Math.round((originalHeight / originalWidth) * maxSize));
} else {
  height = maxSize;
  width = Math.max(1, Math.round((originalWidth / originalHeight) * maxSize));
}

// Resize preserving aspect ratio (no cropping)
.resize(width, height, { fit: 'fill' })
```

---

## BottomSheet Title Integration

### The Problem

On mobile, edit panels showed their title inside the scrollable content (via `SidebarPanel`), but the `BottomSheet` already has a header with a close button. The title and close button weren't aligned.

### The Solution

Pass the title to `BottomSheet` and hide it in `SidebarPanel`:

**File: `src/components/shared/BottomSheet.tsx`**

Left-align the title with padding for the close button:

```typescript
<div
  className={clsx(
    'relative flex items-center px-4 shrink-0',
    title ? 'pb-3 border-b border-border-color' : 'absolute right-0 top-0 pt-3 pb-2 z-10',
  )}
>
  {title && <h2 className="text-lg font-semibold pr-10">{title}</h2>}
  <button className="absolute right-3 top-0 ...">
    <CloseSVG />
  </button>
</div>
```

**Files: Edit components**

Added `hideTitle` prop to the chain:
- `SidebarPanel` - accepts `hideTitle` prop
- `PhotoEditSidebar` / `AlbumEditSidebar` - passes `hideTitle` to child forms
- `SinglePhotoEditForm` / `BulkPhotoEditForm` - passes `hideTitle` to `SidebarPanel`
- `SingleAlbumEditForm` / `BulkAlbumEditForm` - same

**Files: Manage pages**

Updated to pass title to BottomSheet and hideTitle to sidebars:

```typescript
<BottomSheet
  isOpen={isMobileEditSheetOpen}
  onClose={handleMobileEditClose}
  title={selectedPhotos.length === 1 ? 'Edit photo' : `Edit ${selectedPhotos.length} photos`}
>
  <PhotoEditSidebar
    hideTitle
    ...
  />
</BottomSheet>
```

---

## Server-Side Image Cropping

### The Problem

Thumbnails like `AlbumMiniCard` (square) and `PhotoCard` (square) were requesting full-aspect images and using `object-cover` CSS to crop them client-side. This wastes bandwidth.

### The Solution

**File: `src/utils/supabaseImageLoader.ts`**

Added two helper functions:

```typescript
// For square thumbnails (64x64, 256x256, etc.)
export function getSquareThumbnailUrl(
  src: string | null | undefined,
  size: number = 256,
  quality: number = 85,
): string | null {
  // Uses resize=cover to center-crop on Supabase
  url.searchParams.set('width', size.toString());
  url.searchParams.set('height', size.toString());
  url.searchParams.set('resize', 'cover');
  return url.toString();
}

// For aspect-ratio thumbnails (512x384 for 4:3, etc.)
export function getCroppedThumbnailUrl(
  src: string | null | undefined,
  width: number,
  height: number,
  quality: number = 85,
): string | null {
  url.searchParams.set('width', width.toString());
  url.searchParams.set('height', height.toString());
  url.searchParams.set('resize', 'cover');
  return url.toString();
}
```

**Applied to components:**
- `AlbumMiniCard` - `getSquareThumbnailUrl(coverImageUrl, 64, 85)`
- `PhotoCard` - `getSquareThumbnailUrl(photo.url, 256, 85)`
- `PhotoListItem` - `getSquareThumbnailUrl(photo.url, variant === 'compact' ? 48 : 72, 85)`
- `AlbumCard` - `getCroppedThumbnailUrl(coverImage, 512, 384, 85)` (4:3 aspect)
- `manage/AlbumCard` - `getCroppedThumbnailUrl(coverImage, 250, 188, 85)` (4:3 aspect)

### Image Size Capping

The loader now caps requested width at 2400px to prevent Next.js DPR scaling from requesting huge images:

```typescript
const maxWidth = 2400;
const cappedWidth = Math.min(width, maxWidth);
url.searchParams.set('width', cappedWidth.toString());
```

---

## JustifiedPhotoGrid Sizing

**File: `src/components/photo/JustifiedPhotoGrid.tsx`**

Changed `sizes` prop to request 2x display width, letting the loader cap it:

```typescript
sizes={`${Math.ceil(item.displayWidth * 2)}px`}
```

This ensures high-DPI displays get good quality while the loader's 2400px cap prevents oversized requests.

---

## EventImage Dimensions

**File: `src/components/events/EventImage.tsx`**

Updated default variant dimensions from 480x360 to 480x272 to match the CSS constraint `h-34` (136px height at 240px width = ~1.76 aspect ratio):

```typescript
<BlurImage
  width={480}
  height={272}  // Was 360
  ...
/>
```

---

## All Modified Files (25 total)

### Modified Files
- `scripts/generate-event-blurhash.ts` - Preserve aspect ratio in blurhash generation
- `src/app/account/(manage)/albums/[slug]/AlbumDetailClient.tsx` - Pass title to BottomSheet, hideTitle to sidebars
- `src/app/account/(manage)/albums/page.tsx` - Pass title to BottomSheet, hideTitle to sidebar
- `src/app/account/(manage)/photos/page.tsx` - Pass title to BottomSheet, hideTitle to sidebar
- `src/app/events/[eventSlug]/page.tsx` - Minor cleanup
- `src/components/album/AlbumCard.tsx` - Use getCroppedThumbnailUrl for 4:3 cropping
- `src/components/album/AlbumMiniCard.tsx` - Use getSquareThumbnailUrl for square cropping
- `src/components/events/EventImage.tsx` - Update dimensions to 480x272, remove opacity-90
- `src/components/events/EventsList.tsx` - Minor cleanup
- `src/components/manage/AlbumCard.tsx` - Use getCroppedThumbnailUrl for 4:3 cropping
- `src/components/manage/AlbumEditSidebar.tsx` - Add hideTitle prop, pass to child forms
- `src/components/manage/BulkAlbumEditForm.tsx` - Add hideTitle prop, pass to SidebarPanel
- `src/components/manage/BulkPhotoEditForm.tsx` - Add hideTitle prop, pass to SidebarPanel
- `src/components/manage/PhotoCard.tsx` - Use getSquareThumbnailUrl for square cropping
- `src/components/manage/PhotoEditSidebar.tsx` - Add hideTitle prop, pass to child forms
- `src/components/manage/PhotoListItem.tsx` - Use getSquareThumbnailUrl for square cropping
- `src/components/manage/SidebarPanel.tsx` - Add hideTitle prop support
- `src/components/manage/SingleAlbumEditForm.tsx` - Add hideTitle prop, pass to SidebarPanel
- `src/components/manage/SinglePhotoEditForm.tsx` - Add hideTitle prop, pass to SidebarPanel
- `src/components/photo/JustifiedPhotoGrid.tsx` - Request 2x display width in sizes prop
- `src/components/shared/BlurImage.tsx` - Fix aspect ratio for sized images, use background-image div
- `src/components/shared/BottomSheet.tsx` - Left-align title in header
- `src/database.types.ts` - Regenerated types (removed columns)
- `src/utils/generateBlurhash.ts` - Preserve aspect ratio when generating blurhash
- `src/utils/supabaseImageLoader.ts` - Add cropping helpers, cap width at 2400px
