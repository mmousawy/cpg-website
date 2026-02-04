# Files Changed - Photo and Album Detail Page Layouts

## Overview

Major redesign of photo and album detail pages with a modern two-column layout. The goal was to create a layout similar to Instagram and DeviantArt mobile views - photo/gallery on one side, all metadata in a sidebar on the other. Desktop uses a sticky photo/gallery column with scrollable sidebar, while mobile stacks content vertically with a full-width sidebar section.

## Photo Detail Pages

### PhotoPageContent.tsx

Complete layout overhaul:

- **Two-column desktop layout**: Photo column (sticky, vertically centered) + metadata sidebar (384px fixed width)
- **Single-column mobile layout**: Photo on top, full-width sidebar below with background color and border
- **Sidebar content order**: Author row → Title/Description → Date/Views/EXIF/Tags (pushed to bottom with `mt-auto`) → Likes + Comments

```tsx
// Desktop: Two-column layout
<div className="md:flex md:gap-4 md:items-stretch lg:gap-8">
  {/* Photo column - sticky on desktop */}
  <div className="md:flex-1 md:sticky md:self-start md:top-[90px] md:h-[calc(100vh-106px)]">
    <PhotoWithLightbox ... />
  </div>

  {/* Sidebar - mobile: full-width with bg, desktop: fixed width with border */}
  <div className="mt-4 pt-4 border-t bg-background-light -mx-4 px-4 md:mt-0 md:w-96 md:border md:rounded-lg">
    ...
  </div>
</div>
```

### PhotoWithLightbox.tsx

Dynamic photo sizing based on viewport:

- **Mobile**: Photo fits within viewport minus header (56px) and spacing (48px)
- **Tablet**: Accounts for sidebar width (384px), gap (16px), and padding (32px)
- **Desktop**: Same as tablet but with larger padding (64px) and gap (32px)
- Uses `ResizeObserver` to recalculate on container size changes
- Blurhash placeholder stays visible until full image fades in on top

```tsx
const calculateSize = useCallback(() => {
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  // Available width accounts for sidebar on tablet/desktop
  const availableWidth = isMobile
    ? containerWidth
    : Math.min(containerWidth, isTablet ? maxWidthTablet : maxWidthDesktop);

  // Max height based on viewport minus header and padding
  const maxHeight = isMobile
    ? window.innerHeight - 104
    : isTablet
      ? window.innerHeight - 106
      : window.innerHeight - 138;

  // Calculate photo size preserving aspect ratio
  ...
}, [width, height]);
```

## Album Detail Pages

### AlbumContent.tsx

Same two-column layout pattern as photo pages:

- **Gallery column**: Vertically centered with min-height matching viewport
- **Sidebar**: Full viewport height with min-height, contains author/title/date/views/photo count/tags/likes/comments
- **Sticky button**: "View in Gallery" button sticks to bottom of gallery column (16px mobile, 32px desktop)
- **Removed**: Admin moderation panel hidden for now

```tsx
{/* Gallery column - vertically centered */}
<div className="w-full md:flex-1 md:flex md:flex-col md:justify-center md:min-h-[calc(100vh-106px)]">
  <JustifiedPhotoGrid ... />

  {/* Sticky button at bottom */}
  <div className="sticky bottom-4 mt-4 flex justify-center md:bottom-8">
    <FullSizeGalleryButton ... />
  </div>
</div>
```

### JustifiedPhotoGrid.tsx

Switched from viewport-based to container-based responsive breakpoints:

```tsx
// Before: viewport breakpoints
<div className="block sm:hidden">...</div>  // < 640px
<div className="hidden sm:block lg:hidden">...</div>  // 640-1024px
<div className="hidden lg:block">...</div>  // > 1024px

// After: container queries
<div className="@container w-full">
  <div className="block @[600px]:hidden">...</div>  // container < 600px
  <div className="hidden @[600px]:block @[960px]:hidden">...</div>  // 600-960px
  <div className="hidden @[960px]:block">...</div>  // container >= 960px
</div>
```

This means the grid adapts to its actual available space, not the viewport. When displayed alongside a sidebar, it shows fewer columns appropriately.

## New Components

### AuthorRow.tsx

Compact author display used on photo and album detail pages:

```tsx
<Link href={`/@${profile.nickname}`} className="group flex items-center gap-2.5">
  <Avatar avatarUrl={profile.avatar_url} fullName={profile.full_name} size="sm" />
  <div>
    <p className="font-medium text-sm">{profile.full_name || profile.nickname}</p>
    <p className="text-xs text-foreground/60">@{profile.nickname}</p>
  </div>
</Link>
```

### PhotoActionBar.tsx

Horizontal action bar for likes and optional view count:

```tsx
<div className="flex items-center gap-4">
  <DetailLikesSection entityType={entityType} entityId={entityId} initialCount={initialLikesCount} />
  {viewCount > 0 && <ViewCount count={viewCount} compact />}
</div>
```

## New Icons

- `calendar-today.svg` - Google Material icon for date display
- `camera-aperture.svg` - Google Material icon for EXIF data display

Both are 16x16 sized, used inline with metadata text.

## Other Changes

### ViewCount.tsx
- Eye icon size standardized to 16px (`size-4`)

### Comments.tsx
- Spacing tightened (`space-y-4` → `space-y-3`, `mt-8` → `mt-6`)
- Comment cards use smaller shadows and tighter padding

### BlurImage.tsx
- Blurhash `backgroundSize` changed from `cover` to `100% 100%` to prevent cropping

## All Modified Files

New:
- public/icons/calendar-today.svg
- public/icons/camera-aperture.svg
- src/components/shared/AuthorRow.tsx
- src/components/shared/PhotoActionBar.tsx

Modified:
- src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx
- src/components/layout/PageContainer.tsx
- src/components/photo/JustifiedPhotoGrid.tsx
- src/components/photo/PhotoPageContent.tsx
- src/components/photo/PhotoWithLightbox.tsx
- src/components/shared/BlurImage.tsx
- src/components/shared/Comments.tsx
- src/components/shared/TagsSection.tsx
- src/components/shared/ViewCount.tsx
