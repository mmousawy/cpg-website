import type { Photo } from '@/types/photos';
import { calculateJustifiedLayout, type PhotoRow } from '@/utils/justifiedLayout';
import Image from 'next/image';
import Link from 'next/link';

interface JustifiedPhotoGridProps {
  photos: Photo[];
  profileNickname: string;
  /** If provided, photos link to album photo pages instead of standalone photo pages */
  albumSlug?: string;
}

// Reference widths for different breakpoints
const MOBILE_WIDTH = 400;   // ~2-3 photos per row
const TABLET_WIDTH = 600;   // ~3-4 photos per row
const DESKTOP_WIDTH = 960; // ~4-5 photos per row

/**
 * Responsive justified photo grid
 * Calculates layouts for different breakpoints and shows appropriate one via CSS
 */
export default function JustifiedPhotoGrid({
  photos,
  profileNickname,
  albumSlug,
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

  return (
    <>
      {/* Mobile layout */}
      <div className="block sm:hidden">
        <PhotoRows rows={mobileRows} profileNickname={profileNickname} albumSlug={albumSlug} />
      </div>

      {/* Tablet layout */}
      <div className="hidden sm:block lg:hidden">
        <PhotoRows rows={tabletRows} profileNickname={profileNickname} albumSlug={albumSlug} />
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:block">
        <PhotoRows rows={desktopRows} profileNickname={profileNickname} albumSlug={albumSlug} />
      </div>
    </>
  );
}

function PhotoRows({
  rows,
  profileNickname,
  albumSlug,
}: {
  rows: PhotoRow[];
  profileNickname: string;
  albumSlug?: string;
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
              const thumbnailUrl = `${item.photo.url}?width=800&quality=80`;
              // Link to album photo page if albumSlug provided, otherwise standalone photo page
              const photoHref = albumSlug
                ? `/@${profileNickname}/album/${albumSlug}/photo/${item.photo.id}`
                : `/@${profileNickname}/photo/${item.photo.id}`;

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
                    alt="Photo"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
