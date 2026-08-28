'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { StreamPhoto } from '@/lib/data/gallery';
import type { Photo } from '@/types/photos';
import { calculateJustifiedLayout, type PhotoRow } from '@/utils/justifiedLayout';
import { GRID_THUMBNAIL_QUALITY, THUMBNAIL_IMAGE_QUALITY } from '@/utils/supabaseImageLoader';
import HoverPrefetchLink from '../shared/HoverPrefetchLink';
import Avatar from '../auth/Avatar';
import BlurImage from '../shared/BlurImage';
import CardLikes from '../shared/CardLikes';
import EmptyState from '../shared/EmptyState';
import type { JustifiedPhotoGridCoreProps } from './justifiedPhotoGridTypes';
import ImageSVG from 'public/icons/image.svg';

const MOBILE_WIDTH = 400;
const TABLET_WIDTH = 600;
const DESKTOP_WIDTH = 960;

type GridBreakpoint = 'mobile' | 'tablet' | 'desktop';

function widthToBreakpoint(width: number): GridBreakpoint {
  if (width >= DESKTOP_WIDTH) return 'desktop';
  if (width >= TABLET_WIDTH) return 'tablet';
  return 'mobile';
}

/** Max CSS width of the grid at each breakpoint. Browser then applies DPR to sizes=. */
const MOBILE_MAX_CSS_WIDTH = 384;
const TABLET_MAX_CSS_WIDTH = 960;
const DESKTOP_MAX_CSS_WIDTH = 1800;

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
  return `${Math.min(Math.ceil(cssWidth), maxCssWidth)}px`;
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
    targetRowHeight: 180,
    maxRowHeight,
  });
  const tabletRows = calculateJustifiedLayout(photoInput, TABLET_WIDTH, {
    minPhotosPerRow: minPhotosPerRow ?? 2,
    maxPhotosPerRow: 4,
    targetRowHeight: 220,
    maxRowHeight,
  });
  const desktopRows = calculateJustifiedLayout(photoInput, DESKTOP_WIDTH, {
    minPhotosPerRow: minPhotosPerRow ?? 2,
    maxPhotosPerRow: 5,
    targetRowHeight: 280,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [breakpoint, setBreakpoint] = useState<GridBreakpoint>('mobile');

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const next = widthToBreakpoint(el.clientWidth);
      setBreakpoint((current) => (current === next ? current : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const activeLayout = {
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
  }[breakpoint];

  return (
    <div
      ref={containerRef}
      className="@container w-full"
    >
      <PhotoRows
        rows={activeLayout.rows}
        photoMap={photoMap}
        batchLikesMap={batchLikesMap}
        profileNickname={profileNickname}
        albumSlug={albumSlug}
        challengeSlug={challengeSlug}
        eventSlug={eventSlug}
        showAttribution={showAttribution}
        layoutWidth={activeLayout.layoutWidth}
        maxCssWidth={activeLayout.maxCssWidth}
        quality={activeLayout.quality}
        header={header}
        gapClass={activeLayout.gapClass}
      />
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
  layoutWidth,
  maxCssWidth,
  quality,
  header,
  gapClass = 'gap-1 mb-1',
}: {
  rows: PhotoRow[];
  photoMap: Map<string, Photo | StreamPhoto>;
  batchLikesMap: Map<string, number>;
  profileNickname?: string;
  albumSlug?: string;
  challengeSlug?: string;
  eventSlug?: string;
  showAttribution: boolean;
  layoutWidth: number;
  maxCssWidth: number;
  quality: number;
  header?: React.ReactNode;
  gapClass?: string;
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
              const nickname = albumSlug && profileNickname
                ? profileNickname
                : streamPhoto?.profile?.nickname || profileNickname || '';

              const photoHref = challengeSlug
                ? `/challenges/${challengeSlug}/photo/${item.photo.id}`
                : eventSlug
                  ? `/events/${eventSlug}/photo/${item.photo.id}`
                  : albumSlug
                    ? `/@${nickname}/album/${albumSlug}/photo/${item.photo.id}`
                    : `/@${nickname}/photo/${item.photo.id}`;

              const shortId = photo?.short_id || photo?.id;
              const likesCount = (shortId ? batchLikesMap.get(shortId) : undefined) ?? photo?.likes_count ?? 0;

              const photoTitle = photo?.title;
              const ariaLabel = photoTitle
                ? `View photo: ${photoTitle} by @${nickname}`
                : `View photo by @${nickname}`;

              return (
                <HoverPrefetchLink
                  key={item.photo.id}
                  href={photoHref}
                  className="group relative block overflow-hidden bg-background-light"
                  aria-label={ariaLabel}
                  style={isConstrained ? {
                    width: item.displayWidth,
                    height: item.displayHeight,
                  } : {
                    flexGrow: item.photo.aspectRatio,
                    flexBasis: 0,
                    aspectRatio: item.photo.aspectRatio,
                  }}
                >
                  <BlurImage
                    src={thumbnailUrl}
                    alt=""
                    blurhash={photo?.blurhash}
                    fill
                    className="object-cover transition-all duration-200 group-hover:brightness-110"
                    sizes={getThumbnailSizes(item.displayWidth, layoutWidth, maxCssWidth, isConstrained)}
                    loading="lazy"
                    fetchPriority="low"
                    quality={quality}
                  />

                  {photo?.id && <CardLikes
                    likesCount={likesCount}
                    className="absolute bottom-2! right-2! z-10"
                  />}

                  {photo?.title && (
                    <div
                      className="absolute inset-x-0 top-0 h-20 backdrop-blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{
                        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                        maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                      }}
                    />
                  )}
                  {photo?.title && (
                    <div
                      className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-black/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    />
                  )}
                  {photo?.title && (
                    <div
                      className="absolute top-0 left-0 right-0 p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    >
                      <h3
                        className="text-sm font-semibold text-white line-clamp-2 drop-shadow-md"
                      >
                        {photo.title}
                      </h3>
                    </div>
                  )}

                  {showAttribution && streamPhoto?.profile && (
                    <div
                      className="absolute inset-x-0 bottom-0 h-20 backdrop-blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{
                        WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
                        maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
                      }}
                    />
                  )}
                  {showAttribution && streamPhoto?.profile && (
                    <div
                      className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    />
                  )}
                  {showAttribution && streamPhoto?.profile && (
                    <div
                      className="absolute left-0 right-0 pr-12 bottom-0 flex items-center gap-1 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    >
                      <Avatar
                        avatarUrl={streamPhoto.profile.avatar_url}
                        fullName={streamPhoto.profile.full_name}
                        size="xxs"
                      />
                      <span
                        className="text-xs font-medium text-white"
                      >
                        @
                        {streamPhoto.profile.nickname}
                      </span>
                    </div>
                  )}
                </HoverPrefetchLink>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
