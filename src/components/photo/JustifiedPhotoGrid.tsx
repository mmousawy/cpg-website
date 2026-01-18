'use client';

import { useBatchPhotoLikeCounts } from '@/hooks/useLikes';
import type { StreamPhoto } from '@/lib/data/gallery';
import type { Photo } from '@/types/photos';
import { calculateJustifiedLayout, type PhotoRow } from '@/utils/justifiedLayout';
import Image from 'next/image';
import Link from 'next/link';
import Avatar from '../auth/Avatar';
import CardLikes from '../shared/CardLikes';

interface JustifiedPhotoGridProps {
  photos: Photo[] | StreamPhoto[];
  /** Profile nickname - required when showAttribution is false */
  profileNickname?: string;
  /** If provided, photos link to album photo pages instead of standalone photo pages */
  albumSlug?: string;
  /** Show attribution overlay with user avatar/name on hover (for community photostream) */
  showAttribution?: boolean;
}

// Reference widths for different breakpoints
const MOBILE_WIDTH = 400;   // ~2-3 photos per row
const TABLET_WIDTH = 600;   // ~3-4 photos per row
const DESKTOP_WIDTH = 960; // ~4-5 photos per row

/**
 * Responsive justified photo grid
 * Calculates layouts for different breakpoints and shows appropriate one via CSS
 *
 * Use cases:
 * - Single user's photos: pass profileNickname, optionally albumSlug
 * - Community photostream: pass showAttribution=true (photos must include profile data)
 */
export default function JustifiedPhotoGrid({
  photos,
  profileNickname,
  albumSlug,
  showAttribution = false,
}: JustifiedPhotoGridProps) {
  // Collect short_ids for batch fetching - must be before any early returns
  const shortIds = photos
    .map((p) => p.short_id || p.id)
    .filter((id): id is string => !!id);

  // Batch fetch like counts client-side for real-time updates
  const batchLikesQuery = useBatchPhotoLikeCounts(shortIds);
  const batchLikesMap = batchLikesQuery.data || new Map<string, number>();

  if (photos.length === 0) {
    return (
      <div
        className="rounded-lg border border-border-color bg-background-light p-12 text-center"
      >
        <p
          className="text-lg opacity-70"
        >
          No photos yet.
        </p>
      </div>
    );
  }

  const photoInput = photos.map((p) => ({
    id: p.short_id || p.id,
    url: p.url,
    width: p.width || 400,
    height: p.height || 400,
  }));

  // Calculate layouts for each breakpoint with appropriate constraints
  const mobileRows = calculateJustifiedLayout(photoInput, MOBILE_WIDTH, {
    minPhotosPerRow: 2,
    maxPhotosPerRow: 3,
    targetRowHeight: 180,
  });
  const tabletRows = calculateJustifiedLayout(photoInput, TABLET_WIDTH, {
    minPhotosPerRow: 2,
    maxPhotosPerRow: 4,
    targetRowHeight: 220,
  });
  const desktopRows = calculateJustifiedLayout(photoInput, DESKTOP_WIDTH, {
    minPhotosPerRow: 2,
    maxPhotosPerRow: 5,
    targetRowHeight: 280,
  });

  // Create a map from short_id to photo for consistent lookups
  const photoMap = new Map(photos.map((p) => [p.short_id || p.id, p]));

  return (
    <>
      {/* Mobile layout */}
      <div
        className="block sm:hidden"
      >
        <PhotoRows
          rows={mobileRows}
          photoMap={photoMap}
          batchLikesMap={batchLikesMap}
          profileNickname={profileNickname}
          albumSlug={albumSlug}
          showAttribution={showAttribution}
        />
      </div>

      {/* Tablet layout */}
      <div
        className="hidden sm:block lg:hidden"
      >
        <PhotoRows
          rows={tabletRows}
          photoMap={photoMap}
          batchLikesMap={batchLikesMap}
          profileNickname={profileNickname}
          albumSlug={albumSlug}
          showAttribution={showAttribution}
        />
      </div>

      {/* Desktop layout */}
      <div
        className="hidden lg:block"
      >
        <PhotoRows
          rows={desktopRows}
          photoMap={photoMap}
          batchLikesMap={batchLikesMap}
          profileNickname={profileNickname}
          albumSlug={albumSlug}
          showAttribution={showAttribution}
        />
      </div>
    </>
  );
}

function PhotoRows({
  rows,
  photoMap,
  batchLikesMap,
  profileNickname,
  albumSlug,
  showAttribution,
}: {
  rows: PhotoRow[];
  photoMap: Map<string, Photo | StreamPhoto>;
  batchLikesMap: Map<string, number>;
  profileNickname?: string;
  albumSlug?: string;
  showAttribution: boolean;
}) {

  return (
    <div
      className="w-full"
    >
      {rows.map((row, rowIndex) => {
        // If row has a constrained width (single portrait photo), center it
        const isConstrained = row.width !== undefined;

        return (
          <div
            key={rowIndex}
            className="mb-1 flex gap-1 last:mb-0"
            style={isConstrained ? { justifyContent: 'center' } : undefined}
          >
            {row.items.map((item) => {
              const photo = photoMap.get(item.photo.id);
              const thumbnailUrl = `${item.photo.url}?width=800&quality=80`;

              // Get nickname from photo's profile (community) or use provided profileNickname
              const streamPhoto = photo as StreamPhoto;
              const nickname = streamPhoto?.profile?.nickname || profileNickname || '';

              // Link to album photo page if albumSlug provided, otherwise standalone photo page
              const photoHref = albumSlug
                ? `/@${nickname}/album/${albumSlug}/photo/${item.photo.id}`
                : `/@${nickname}/photo/${item.photo.id}`;

              // Get likes count from client-side batch fetch, fallback to server-provided column
              const shortId = photo?.short_id || photo?.id;
              const likesCount = (shortId ? batchLikesMap.get(shortId) : undefined) ?? photo?.likes_count ?? 0;

              // Create accessible label for photo link
              const photoTitle = photo?.title;
              const ariaLabel = photoTitle
                ? `View photo: ${photoTitle} by @${nickname}`
                : `View photo by @${nickname}`;

              return (
                <Link
                  key={item.photo.id}
                  href={photoHref}
                  className="group relative block overflow-hidden bg-background-light transition-all hover:brightness-110"
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
                  <Image
                    src={thumbnailUrl}
                    alt={photo?.title || 'Photo'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 256px, (max-width: 1024px) 480px, 512px"
                    loading='lazy'
                    quality={85}
                  />

                  {/* Likes overlay */}
                  {photo?.id && <CardLikes
                    likesCount={likesCount}
                    className="absolute bottom-2! right-2! z-10"
                  />}

                  {/* Top blur layer with gradient mask */}
                  {photo?.title && (
                    <div
                      className="absolute inset-x-0 top-0 h-20 backdrop-blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{
                        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                        maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                      }}
                    />
                  )}
                  {/* Top gradient overlay */}
                  {photo?.title && (
                    <div
                      className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    />
                  )}
                  {/* Title - top left, visible on hover */}
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

                  {/* Bottom blur layer with gradient mask */}
                  {showAttribution && streamPhoto?.profile && (
                    <div
                      className="absolute inset-x-0 bottom-0 h-20 backdrop-blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{
                        WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
                        maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
                      }}
                    />
                  )}
                  {/* Bottom gradient overlay */}
                  {showAttribution && streamPhoto?.profile && (
                    <div
                      className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    />
                  )}
                  {/* Attribution - bottom left, visible on hover */}
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
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
