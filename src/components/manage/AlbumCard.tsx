'use client';

import CardBadges from '@/components/shared/CardBadges';
import type { AlbumWithPhotos } from '@/types/albums';
import clsx from 'clsx';
import Image from 'next/image';
import FolderSVG from 'public/icons/folder.svg';
import PrivateMicroSVG from 'public/icons/private-micro.svg';
import { memo, useMemo } from 'react';

interface AlbumCardProps {
  album: AlbumWithPhotos;
  isSelected?: boolean;
  isHovered?: boolean;
}

function AlbumCard({
  album,
  isSelected = false,
  isHovered = false,
}: AlbumCardProps) {
  const coverImage = album.cover_image_url || album.photos?.[0]?.photo_url;
  const photoCount = album.photos?.length || 0;

  const badges = useMemo(() => {
    if (!album.is_public) {
      return [
        {
          icon: <PrivateMicroSVG
            className="size-4"
          />,
          variant: 'private' as const,
          tooltip: 'Private (only visible to you)',
        },
      ];
    }
    return [];
  }, [album.is_public]);

  return (
    <div
      className={clsx(
        'relative cursor-pointer overflow-hidden bg-background-light transition-all border border-border-color',
        isSelected
          ? 'ring-2 ring-primary ring-offset-1 light:ring-offset-white dark:ring-offset-white/50'
          : isHovered
            ? 'ring-2 ring-primary/50 ring-offset-0 [&>:last-child]:opacity-80'
            : 'hover:ring-2 hover:ring-primary/50',
      )}
    >
      {/* Cover image */}
      <div
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-background"
      >
        {coverImage ? (
          <Image
            src={coverImage}
            alt={album.title}
            fill
            sizes="250px"
            quality={85}
            className="object-cover"
            draggable={false}
          />
        ) : (
          <FolderSVG
            className="size-12 text-foreground/20"
          />
        )}

        {/* Badges */}
        <CardBadges
          badges={badges}
        />
      </div>

      {/* Info section */}
      <div
        className="p-3"
      >
        <h3
          className="text-sm font-semibold line-clamp-1"
        >
          {album.title}
        </h3>
        <p
          className="text-xs text-foreground/50 mt-1"
        >
          {photoCount}
          {' '}
          {photoCount === 1 ? 'photo' : 'photos'}
        </p>
      </div>

      {/* Hover overlay */}
      <div
        className="absolute inset-0 z-0 bg-primary/50 opacity-0 transition-opacity pointer-events-none"
      ></div>
    </div>
  );
}

export default memo(AlbumCard, (prevProps, nextProps) => {
  // Only re-render if album data, selection, or hover state changes
  return (
    prevProps.album.id === nextProps.album.id &&
    prevProps.album.title === nextProps.album.title &&
    prevProps.album.cover_image_url === nextProps.album.cover_image_url &&
    prevProps.album.is_public === nextProps.album.is_public &&
    prevProps.album.photos?.length === nextProps.album.photos?.length &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered
  );
});
