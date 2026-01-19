'use client';

import CardBadges from '@/components/shared/CardBadges';
import type { Photo, PhotoWithAlbums } from '@/types/photos';
import clsx from 'clsx';
import Image from 'next/image';
import FolderInAlbumSVG from 'public/icons/folder-in-album.svg';
import PrivateMicroSVG from 'public/icons/private-micro.svg';
import WallArtSVG from 'public/icons/wall-art.svg';
import { memo, useMemo } from 'react';

interface PhotoCardProps {
  photo: (Photo | PhotoWithAlbums) & { isExiting?: boolean };
  isSelected: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  /** URL of the album cover image (if photo is in album context) */
  albumCoverUrl?: string | null;
  /** Current album title (if viewing in album context) */
  currentAlbumTitle?: string | null;
}

function PhotoCard({
  photo,
  isSelected,
  isHovered = false,
  isDragging = false,
  albumCoverUrl,
  currentAlbumTitle,
}: PhotoCardProps) {
  // Use raw URL - custom loader adds transform params automatically
  const thumbnailUrl = photo.url;
  const isAlbumCover = albumCoverUrl === photo.url;

  const photoWithAlbums = photo as PhotoWithAlbums;
  const isInAlbum = photoWithAlbums.albums && photoWithAlbums.albums.length > 0;

  // Find which albums this photo is the cover of
  const coverAlbums = photoWithAlbums.albums?.filter((a) => a.cover_image_url === photo.url) || [];
  const coverAlbumNames = coverAlbums.map((a) => a.title).join(', ');

  const badges = useMemo(() => {
    const badgeList = [];
    if (isAlbumCover) {
      const tooltipText = currentAlbumTitle
        ? `Used as cover of "${currentAlbumTitle}"`
        : coverAlbumNames
          ? `Used as cover of: ${coverAlbumNames}`
          : 'Used as album cover';
      badgeList.push({
        icon: <WallArtSVG
          className="size-4 fill-current"
        />,
        variant: 'album-cover' as const,
        tooltip: tooltipText,
      });
    }
    if (isInAlbum && !isAlbumCover) {
      const albumNames = photoWithAlbums.albums?.map((a) => a.title).join(', ') || '';
      badgeList.push({
        icon: <FolderInAlbumSVG
          className="size-4 fill-current"
        />,
        variant: 'in-album' as const,
        tooltip: albumNames ? `In albums: ${albumNames}` : 'In album',
      });
    }
    if (!photo.is_public) {
      badgeList.push({
        icon: <PrivateMicroSVG
          className="size-4"
        />,
        variant: 'private' as const,
        tooltip: 'Private (only visible to you)',
      });
    }
    return badgeList;
  }, [isAlbumCover, isInAlbum, photo.is_public, photoWithAlbums.albums, currentAlbumTitle, coverAlbumNames]);

  return (
    <div
      className={clsx(
        'cursor-pointer active:cursor-grabbing overflow-hidden transition-all duration-300',
        isSelected
          ? 'ring-2 ring-primary ring-offset-1 light:ring-offset-white dark:ring-offset-white/50'
          : isHovered
            ? 'ring-2 ring-primary/50 ring-offset-0 [&>div>div]:opacity-80'
            : 'hover:ring-2 hover:ring-primary/50',
        isDragging && 'opacity-50',
        photo.isExiting && 'opacity-0 scale-95',
      )}
    >
      {/* Image */}
      <div
        className="aspect-square overflow-hidden bg-background-light"
      >
        <Image
          src={thumbnailUrl}
          alt={photo.title || 'Photo'}
          width={200}
          height={200}
          quality={85}
          className="size-full object-cover transition-transform"
          draggable={false}
        />
        {/* Badges */}
        <CardBadges
          badges={badges}
        />

        {/* Hover overlay */}
        <div
          className="absolute inset-0 bg-primary/50 opacity-0 transition-opacity pointer-events-none"
        ></div>
      </div>

      {/* Title overlay on hover */}
      {photo.title && (
        <div
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <p
            className="truncate text-sm text-white"
          >
            {photo.title}
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(PhotoCard, (prevProps, nextProps) => {
  // Only re-render if photo data, selection, hover, dragging, exit state, album cover, albums, or current album title change
  const prevPhoto = prevProps.photo as PhotoWithAlbums;
  const nextPhoto = nextProps.photo as PhotoWithAlbums;
  const prevAlbumsLength = prevPhoto.albums?.length || 0;
  const nextAlbumsLength = nextPhoto.albums?.length || 0;

  return (
    prevProps.photo.id === nextProps.photo.id &&
    prevProps.photo.url === nextProps.photo.url &&
    prevProps.photo.title === nextProps.photo.title &&
    prevProps.photo.is_public === nextProps.photo.is_public &&
    prevAlbumsLength === nextAlbumsLength &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.photo.isExiting === nextProps.photo.isExiting &&
    prevProps.albumCoverUrl === nextProps.albumCoverUrl &&
    prevProps.currentAlbumTitle === nextProps.currentAlbumTitle
  );
});
