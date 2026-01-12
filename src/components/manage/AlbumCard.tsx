'use client';

import type { AlbumWithPhotos } from '@/types/albums';
import clsx from 'clsx';
import Image from 'next/image';
import { memo } from 'react';
import FolderSVG from 'public/icons/folder.svg';
import PrivateMicroSVG from 'public/icons/private-micro.svg';

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

  return (
    <div
      className={clsx(
        'cursor-pointer overflow-hidden bg-background-light transition-all border border-border-color',
        isSelected
          ? 'ring-2 ring-primary ring-offset-1 light:ring-offset-white dark:ring-offset-white/50'
          : isHovered
            ? 'ring-2 ring-primary/50 ring-offset-0 [&>:last-child]:opacity-80'
            : 'hover:ring-2 hover:ring-primary/50',
      )}
    >
      {/* Cover image */}
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-background">
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
          <FolderSVG className="size-12 text-foreground/20" />
        )}

        {/* Private badge */}
        {!album.is_public && (
          <div className="absolute top-2 right-2">
            <span className="inline-block rounded-full border border-yellow-800 bg-yellow-100 px-1 py-1 text-xs text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-200">
              <PrivateMicroSVG className="size-4" />
            </span>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-3">
        <h3 className="text-sm font-semibold line-clamp-1">{album.title}</h3>
        <p className="text-xs text-foreground/50 mt-1">
          {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
        </p>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-primary/50 opacity-0 transition-opacity"></div>
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
