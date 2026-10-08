'use client';

import { useHasHover } from '@/hooks/useHasHover';
import type { StreamPhoto } from '@/lib/data/gallery';
import type { Photo } from '@/types/photos';
import { calculateJustifiedLayout, type PhotoRow } from '@/utils/justifiedLayout';
import { THUMBNAIL_IMAGE_QUALITY } from '@/utils/supabaseImageLoader';
import EmptyState from '../shared/EmptyState';
import PhotoGridTile, { buildPhotoHref } from './PhotoGridTile';
import type { JustifiedPhotoGridCoreProps } from './justifiedPhotoGridTypes';
import type { PhotoCaptionsMode, PhotoGridDensity } from '@/utils/displayPreferences';
import ImageSVG from 'public/icons/image.svg';

const MOBILE_WIDTH = 400;
const TABLET_WIDTH = 600;
const DESKTOP_WIDTH = 960;

type GridBreakpoint = 'mobile' | 'tablet' | 'desktop';

/** Show the layout that matches the container. All three are in the DOM so the
 * first paint is already the right grid — measuring in JS flashed the mobile
 * rows (including a full-width single photo) until hydration. */
const BREAKPOINT_VISIBILITY: Record<GridBreakpoint, string> = {
  // `hidden` is on every pane so the preload scanner does not fetch the
  // layouts that container queries keep at display:none.
  mobile: 'hidden @max-[599px]:block',
  tablet: 'hidden @min-[600px]:block @min-[960px]:hidden',
  desktop: 'hidden @min-[960px]:block',
};

type GridLayoutConfig = {
  rows: PhotoRow[];
  layoutWidth: number;
  maxCssWidth: number;
  gapClass: string;
};

function getLayoutConfigs(
  mobileRows: PhotoRow[],
  tabletRows: PhotoRow[],
  desktopRows: PhotoRow[],
): Record<GridBreakpoint, GridLayoutConfig> {
  return {
    mobile: {
      rows: mobileRows,
      layoutWidth: MOBILE_WIDTH,
      maxCssWidth: MOBILE_MAX_CSS_WIDTH,
      gapClass: 'gap-1 mb-1',
    },
    tablet: {
      rows: tabletRows,
      layoutWidth: TABLET_WIDTH,
      maxCssWidth: TABLET_MAX_CSS_WIDTH,
      gapClass: 'gap-2 mb-2',
    },
    desktop: {
      rows: desktopRows,
      layoutWidth: DESKTOP_WIDTH,
      maxCssWidth: DESKTOP_MAX_CSS_WIDTH,
      gapClass: 'gap-2 mb-2',
    },
  };
}

/** One sizes value per photo so each breakpoint's <img> requests the same file. */
function getSharedPhotoSizes(
  layouts: Record<GridBreakpoint, GridLayoutConfig>,
): Map<string, string> {
  const sizes = new Map<string, number>();

  for (const layout of Object.values(layouts)) {
    for (const row of layout.rows) {
      const isConstrained = row.width !== undefined;
      for (const item of row.items) {
        const value = Number.parseInt(
          getThumbnailSizes(
            item.displayWidth,
            layout.layoutWidth,
            layout.maxCssWidth,
            isConstrained,
          ),
          10,
        );
        const current = sizes.get(item.photo.id) ?? 0;
        if (value > current) sizes.set(item.photo.id, value);
      }
    }
  }

  return new Map([...sizes].map(([id, value]) => [id, `${value}px`]));
}

/** Max CSS width of the grid at each breakpoint. Browser then applies DPR to sizes=. */
const MOBILE_MAX_CSS_WIDTH = 384;
const TABLET_MAX_CSS_WIDTH = 960;
/** Matches `max-w-screen-xl` on WidePageContainer. */
const DESKTOP_MAX_CSS_WIDTH = 1280;
/** Cap displayed row height; taller portraits are object-cover cropped. */
const MAX_ROW_DISPLAY_HEIGHT = 720;
/**
 * `deviceSizes` jumps from 1200 to 1920. At 2x DPR, any sizes= above 600px
 * picks 1920. Grid thumbs don't need that — cap so 2-photo rows stay on 1200.
 */
const MAX_GRID_THUMB_CSS_WIDTH = 600;

/**
 * `displayWidth` is in layout-calculation space (400 / 600 / 960).
 * Unconstrained rows flex-grow to the real container, so scale up to that CSS width.
 * Constrained rows keep explicit layout pixels — those should not be scaled.
 */
function getThumbnailSizes(
  displayWidth: number,
  layoutWidth: number,
  maxCssWidth: number,
  isConstrained: boolean,
): string {
  const cssWidth = isConstrained
    ? displayWidth
    : displayWidth * (maxCssWidth / layoutWidth);
  return `${Math.min(Math.ceil(cssWidth), maxCssWidth, MAX_GRID_THUMB_CSS_WIDTH)}px`;
}

export default function JustifiedPhotoGridCore({
  photos,
  profileNickname,
  albumSlug,
  challengeSlug,
  eventSlug,
  showAttribution = false,
  maxRowHeight = 350,
  minPhotosPerRow,
  header,
  batchLikesMap,
  captionMode = 'hover',
  gridDensity = 'comfortable',
  targetRowHeightMobile = 180,
  targetRowHeightTablet = 220,
  targetRowHeightDesktop = 280,
}: JustifiedPhotoGridCoreProps) {
  const photoInput = photos.map((p) => ({
    id: p.short_id || p.id,
    url: p.url,
    width: p.width || 400,
    height: p.height || 400,
  }));

  const mobileRows = calculateJustifiedLayout(photoInput, MOBILE_WIDTH, {
    minPhotosPerRow: minPhotosPerRow ?? 2,
    maxPhotosPerRow: 3,
    targetRowHeight: targetRowHeightMobile,
    maxRowHeight,
  });
  const tabletRows = calculateJustifiedLayout(photoInput, TABLET_WIDTH, {
    minPhotosPerRow: minPhotosPerRow ?? 2,
    maxPhotosPerRow: 4,
    targetRowHeight: targetRowHeightTablet,
    maxRowHeight,
  });
  const desktopRows = calculateJustifiedLayout(photoInput, DESKTOP_WIDTH, {
    minPhotosPerRow: minPhotosPerRow ?? 2,
    maxPhotosPerRow: 5,
    targetRowHeight: targetRowHeightDesktop,
    maxRowHeight,
    gap: 8,
  });

  const hasHover = useHasHover();

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={<ImageSVG
          className="size-10 inline-block"
        />}
        title="No photos yet."
      />
    );
  }

  const photoMap = new Map(photos.map((p) => [p.short_id || p.id, p]));
  const layouts = getLayoutConfigs(mobileRows, tabletRows, desktopRows);

  const sharedPhotoSizes = getSharedPhotoSizes(layouts);

  const sharedPhotoRowsProps = {
    photoMap,
    batchLikesMap,
    profileNickname,
    albumSlug,
    challengeSlug,
    eventSlug,
    showAttribution,
    captionMode,
    gridDensity,
    canHover: hasHover,
    header,
    sharedPhotoSizes,
  };

  return (
    <div
      className="@container w-full"
    >
      {(Object.keys(layouts) as GridBreakpoint[]).map((breakpoint) => {
        const layout = layouts[breakpoint];
        return (
          <div
            key={breakpoint}
            className={BREAKPOINT_VISIBILITY[breakpoint]}
          >
            <PhotoRows
              {...sharedPhotoRowsProps}
              rows={layout.rows}
              layoutWidth={layout.layoutWidth}
              maxCssWidth={layout.maxCssWidth}
              gapClass={layout.gapClass}
            />
          </div>
        );
      })}
    </div>
  );
}

function PhotoRows({
  rows,
  photoMap,
  batchLikesMap,
  profileNickname,
  albumSlug,
  challengeSlug,
  eventSlug,
  showAttribution,
  captionMode,
  gridDensity,
  canHover,
  layoutWidth,
  maxCssWidth,
  header,
  gapClass = 'gap-1 mb-1',
  sharedPhotoSizes,
}: {
  rows: PhotoRow[];
  photoMap: Map<string, Photo | StreamPhoto>;
  batchLikesMap: Map<string, number>;
  profileNickname?: string;
  albumSlug?: string;
  challengeSlug?: string;
  eventSlug?: string;
  showAttribution: boolean;
  captionMode: PhotoCaptionsMode;
  gridDensity: PhotoGridDensity;
  canHover: boolean;
  layoutWidth: number;
  maxCssWidth: number;
  header?: React.ReactNode;
  gapClass?: string;
  sharedPhotoSizes: Map<string, string>;
}) {
  const firstRow = rows[0];
  const firstRowConstrained = firstRow?.width !== undefined;

  return (
    <div
      className="w-full"
    >
      {header && (
        <div
          style={firstRowConstrained ? {
            maxWidth: firstRow.width,
            marginInline: 'auto',
          } : undefined}
        >
          {header}
        </div>
      )}
      {rows.map((row, rowIndex) => {
        const isConstrained = row.width !== undefined;
        const scaledHeight = isConstrained
          ? row.height
          : row.height * (maxCssWidth / layoutWidth);
        const isHeightCapped = !isConstrained && scaledHeight > MAX_ROW_DISPLAY_HEIGHT;

        return (
          <div
            key={rowIndex}
            className={`flex last:mb-0 ${gapClass}`}
            style={isConstrained ? { justifyContent: 'center' } : undefined}
          >
            {row.items.map((item) => {
              const photo = photoMap.get(item.photo.id);
              const thumbnailUrl = item.photo.url;

              const streamPhoto = photo as StreamPhoto;
              const { href: photoHref, nickname } = buildPhotoHref({
                photoId: item.photo.id,
                profileNickname,
                albumSlug,
                challengeSlug,
                eventSlug,
                streamNickname: streamPhoto?.profile?.nickname,
              });

              const shortId = photo?.short_id || photo?.id;
              const likesCount = (shortId ? batchLikesMap.get(shortId) : undefined) ?? photo?.likes_count ?? 0;

              if (!photo) return null;

              return (
                <PhotoGridTile
                  key={item.photo.id}
                  photo={photo}
                  likesCount={likesCount}
                  photoHref={photoHref}
                  nickname={nickname}
                  showAttribution={showAttribution}
                  captionMode={captionMode}
                  gridDensity={gridDensity}
                  canHover={canHover}
                  imageSrc={thumbnailUrl}
                  sizes={
                    sharedPhotoSizes.get(item.photo.id)
                    ?? getThumbnailSizes(item.displayWidth, layoutWidth, maxCssWidth, isConstrained)
                  }
                  quality={THUMBNAIL_IMAGE_QUALITY}
                  style={isConstrained ? {
                    width: item.displayWidth,
                    height: item.displayHeight,
                  } : isHeightCapped ? {
                    flexGrow: item.photo.aspectRatio,
                    flexBasis: 0,
                    height: MAX_ROW_DISPLAY_HEIGHT,
                    minWidth: 0,
                  } : {
                    flexGrow: item.photo.aspectRatio,
                    flexBasis: 0,
                    aspectRatio: item.photo.aspectRatio,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
