import type { Photo } from '@/types/photos';
import type { StreamPhoto } from '@/lib/data/gallery';
import { calculateJustifiedLayout, type PhotoRow } from '@/utils/justifiedLayout';
import Image from 'next/image';
import Link from 'next/link';
import Avatar from '../auth/Avatar';

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
  if (photos.length === 0) {
    return (
      <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
        <p className="text-lg opacity-70">No photos yet.</p>
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

  // Create a map from photo id to photo for attribution lookup
  const photoMap = new Map(photos.map((p) => [p.short_id || p.id, p]));

  return (
    <>
      {/* Mobile layout */}
      <div className="block sm:hidden">
        <PhotoRows
          rows={mobileRows}
          photoMap={photoMap}
          profileNickname={profileNickname}
          albumSlug={albumSlug}
          showAttribution={showAttribution}
        />
      </div>

      {/* Tablet layout */}
      <div className="hidden sm:block lg:hidden">
        <PhotoRows
          rows={tabletRows}
          photoMap={photoMap}
          profileNickname={profileNickname}
          albumSlug={albumSlug}
          showAttribution={showAttribution}
        />
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:block">
        <PhotoRows
          rows={desktopRows}
          photoMap={photoMap}
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
  profileNickname,
  albumSlug,
  showAttribution,
}: {
  rows: PhotoRow[];
  photoMap: Map<string, Photo | StreamPhoto>;
  profileNickname?: string;
  albumSlug?: string;
  showAttribution: boolean;
}) {
  return (
    <div className="w-full">
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

              return (
                <Link
                  key={item.photo.id}
                  href={photoHref}
                  className="group relative block overflow-hidden bg-background-light transition-all hover:brightness-110"
                  style={
                    isConstrained
                      ? {
                        width: item.displayWidth,
                        height: item.displayHeight,
                      }
                      : {
                        flexGrow: item.photo.aspectRatio,
                        flexBasis: 0,
                        aspectRatio: item.photo.aspectRatio,
                      }
                  }
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

                  {/* Attribution overlay on hover (community photostream) */}
                  {showAttribution && streamPhoto?.profile && (
                    <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 opacity-0 transition-opacity group-hover:opacity-100">
                      <Avatar
                        avatarUrl={streamPhoto.profile.avatar_url}
                        fullName={streamPhoto.profile.full_name}
                        size="xxs"
                      />
                      <span className="text-xs font-medium text-white">
                        @{streamPhoto.profile.nickname}
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
