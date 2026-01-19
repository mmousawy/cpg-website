# Files Changed - Image Optimization & Supabase Loader Fix

## Problem

The custom image loader had critical bugs causing all images to load at original size:

1. **Supabase images**: Added `?width=X` to `/object/public/` URLs, but Supabase requires `/render/image/public/` for transformations
2. **Local images**: Tried to use `/_next/image` which doesn't work with custom loaders
3. **External images**: Returned as-is but failed Next.js loader validation (missing width)
4. **Static sizes**: Used fixed breakpoint sizes instead of actual display dimensions

## Solution

### Supabase Image Loader (`src/utils/supabaseImageLoader.ts`)

Complete rewrite of the image loader:

```typescript
// Before (broken):
url.searchParams.set('width', width.toString());
return url.toString();  // /object/public/... URLs don't support transforms

// After (fixed):
url.pathname = url.pathname.replace(
  '/storage/v1/object/public/',
  '/storage/v1/render/image/public/'
);
url.searchParams.set('width', width.toString());
return url.toString();  // /render/image/public/... supports transforms
```

**Key changes:**
- Convert `/storage/v1/object/public/` to `/storage/v1/render/image/public/` for Supabase transformations
- Handle StaticImageData objects from static imports (extracts `.src` property)
- Add `?w=WIDTH` to local and external image URLs to satisfy Next.js requirements
- External images load correctly (unoptimized but functional)

### Hero Image (`src/components/shared/HeroImage.tsx`)

Updated `sizes` attribute for better bandwidth efficiency:

```typescript
// Before:
sizes="100vw"

// After:
sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 1200px"
```

**Result:** Hero images capped at 1200px max width instead of 1920px on large screens.

### Justified Photo Grid (`src/components/photo/JustifiedPhotoGrid.tsx`)

Changed from static sizes to dynamic per-image sizing:

```typescript
// Before (static, often oversized):
sizes="(max-width: 640px) 256px, (max-width: 1024px) 480px, 512px"

// After (dynamic, based on actual display):
sizes={`${Math.ceil(item.displayWidth * 1.5)}px`}
```

**Benefits:**
- Each image requests size based on its actual calculated display width
- 1.5x multiplier for retina display quality
- Portrait and landscape photos both sized appropriately
- Significant bandwidth savings for grid layouts

## Modified Files

| File | Changes |
|------|---------|
| `src/utils/supabaseImageLoader.ts` | Fixed Supabase transform URL, handle static imports, add width param to all URLs |
| `src/components/shared/HeroImage.tsx` | Responsive sizes with 1200px max |
| `src/components/photo/JustifiedPhotoGrid.tsx` | Dynamic `sizes` based on `item.displayWidth * 1.5` |

## Image Handling Summary

| Image Type | Behavior |
|------------|----------|
| **Supabase images** | Properly resized via `/render/image/` endpoint with width/quality params |
| **Local images** (`/public`, `/_next/static`) | Load with `?w=WIDTH` query param (browsers ignore unknown params) |
| **External images** (gravatar, discord, google, etc.) | Load with `?w=WIDTH` query param (unoptimized but functional) |
| **Static imports** | StaticImageData `.src` extracted, then processed as local images |

## Testing

Verify in browser DevTools Network tab:
- Supabase images: URLs contain `/render/image/public/` with `?width=X&quality=85`
- Local images: URLs have `?w=X` query param
- Grid images: Width values match ~1.5x actual display size
- Hero images: Request max 1200px width on desktop
