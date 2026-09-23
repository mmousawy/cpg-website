'use client';

import { useHasHover } from '@/hooks/useHasHover';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { StreamPhoto } from '@/lib/data/gallery';
import type { Photo } from '@/types/photos';
import { calculateJustifiedLayout, type PhotoRow } from '@/utils/justifiedLayout';
import { GRID_THUMBNAIL_QUALITY, THUMBNAIL_IMAGE_QUALITY } from '@/utils/supabaseImageLoader';
import EmptyState from '../shared/EmptyState';
import PhotoGridTile, { buildPhotoHref } from './PhotoGridTile';
import type { JustifiedPhotoGridCoreProps } from './justifiedPhotoGridTypes';
import type { PhotoCaptionsMode, PhotoGridDensity } from '@/utils/displayPreferences';
import ImageSVG from 'public/icons/image.svg';

const MOBILE_WIDTH = 400;
const TABLET_WIDTH = 600;
const DESKTOP_WIDTH = 960;

type GridBreakpoint = 'mobile' | 'tablet' | 'desktop';

function widthToBreakpoint(width: number): GridBreakpoint | null {
  if (width <= 0) return null;
  if (width >= DESKTOP_WIDTH) return 'desktop';
  if (width >= TABLET_WIDTH) return 'tablet';
  return 'mobile';
}

type GridLayoutConfig = {
  rows: PhotoRow[];
  layoutWidth: number;
  maxCssWidth: number;
  quality: number;
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
      quality: GRID_THUMBNAIL_QUALITY,
      gapClass: 'gap-1 mb-1',
    },
    tablet: {
      rows: tabletRows,
      layoutWidth: TABLET_WIDTH,
      maxCssWidth: TABLET_MAX_CSS_WIDTH,
      quality: THUMBNAIL_IMAGE_QUALITY,
      gapClass: 'gap-2 mb-2',
    },
    desktop: {
      rows: desktopRows,
      layoutWidth: DESKTOP_WIDTH,
      maxCssWidth: DESKTOP_MAX_CSS_WIDTH,
      quality: THUMBNAIL_IMAGE_QUALITY,
      gapClass: 'gap-2 mb-2',
    },
  };
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
  const hasHover = useHasHover();
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'css' | 'js'>('css');
  const [breakpoint, setBreakpoint] = useState<GridBreakpoint>('mobile');
  const [containerWidth, setContainerWidth] = useState(0);

  const layouts = getLayoutConfigs(mobileRows, tabletRows, desktopRows);

  const measureBreakpoint = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.clientWidth;
    setContainerWidth((current) => (current === width ? current : width));
    const next = widthToBreakpoint(width);
    if (!next) return;
    setBreakpoint((current) => (current === next ? current : next));
  }, []);

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (node) {
      const width = node.clientWidth;
      setContainerWidth((current) => (current === width ? current : width));
      const next = widthToBreakpoint(width);
      if (next) {
        setBreakpoint((current) => (current === next ? current : next));
      }
    }
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    measureBreakpoint();
    setPhase('js');

    const observer = new ResizeObserver(measureBreakpoint);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measureBreakpoint]);

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
    containerWidth,
  };

  const activeLayout = layouts[breakpoint];

  return (
    <div
      ref={setContainerRef}
      className="@container w-full"
    >
      {phase === 'css' ? (
        <PhotoRows
          {...sharedPhotoRowsProps}
          rows={layouts.mobile.rows}
          layoutWidth={layouts.mobile.layoutWidth}
          maxCssWidth={layouts.mobile.maxCssWidth}
          quality={layouts.mobile.quality}
          gapClass={layouts.mobile.gapClass}
        />
      ) : (
        <PhotoRows
          {...sharedPhotoRowsProps}
          rows={activeLayout.rows}
          layoutWidth={activeLayout.layoutWidth}
          maxCssWidth={activeLayout.maxCssWidth}
          quality={activeLayout.quality}
          gapClass={activeLayout.gapClass}
        />
      )}
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
  quality,
  header,
  gapClass = 'gap-1 mb-1',
  containerWidth = 0,
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
  quality: number;
  header?: React.ReactNode;
  gapClass?: string;
  containerWidth?: number;
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
        const cssWidth = containerWidth > 0 ? containerWidth : maxCssWidth;
        const scaledHeight = isConstrained
          ? row.height
          : row.height * (cssWidth / layoutWidth);
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
                  sizes={getThumbnailSizes(item.displayWidth, layoutWidth, maxCssWidth, isConstrained)}
                  quality={quality}
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
