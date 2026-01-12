'use client';

import type { Photo } from '@/types/photos';
import clsx from 'clsx';
import Image from 'next/image';
import { memo } from 'react';
import PrivateMicroSVG from 'public/icons/private-micro.svg';

interface PhotoCardProps {
  photo: Photo & { isExiting?: boolean };
  isSelected: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
}

function PhotoCard({
  photo,
  isSelected,
  isHovered = false,
  isDragging = false,
}: PhotoCardProps) {
  const thumbnailUrl = `${photo.url}?width=400&height=400&resize=cover`;

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
      <div className="aspect-square overflow-hidden bg-background-light">
        <Image
          src={thumbnailUrl}
          alt={photo.title || 'Photo'}
          width={200}
          height={200}
          quality={85}
          className="size-full object-cover transition-transform"
          draggable={false}
        />
        {/* Private badge */}
        {!photo.is_public && (
          <div className="absolute top-2 right-2">
            <span className="inline-block rounded-full border border-yellow-800 bg-yellow-100 px-1 py-1 text-xs text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-200">
              <PrivateMicroSVG className="size-4" />
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary/50 opacity-0 transition-opacity"></div>
      </div>

      {/* Title overlay on hover */}
      {photo.title && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="truncate text-sm text-white">{photo.title}</p>
        </div>
      )}
    </div>
  );
}

export default memo(PhotoCard, (prevProps, nextProps) => {
  // Only re-render if photo data, selection, hover, dragging, or exit state changes
  return (
    prevProps.photo.id === nextProps.photo.id &&
    prevProps.photo.url === nextProps.photo.url &&
    prevProps.photo.title === nextProps.photo.title &&
    prevProps.photo.is_public === nextProps.photo.is_public &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.photo.isExiting === nextProps.photo.isExiting
  );
});
