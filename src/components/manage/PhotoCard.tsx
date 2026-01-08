'use client';

import type { Photo } from '@/types/photos';
import clsx from 'clsx';
import Image from 'next/image';

interface PhotoCardProps {
  photo: Photo;
  isSelected: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
}

export default function PhotoCard({
  photo,
  isSelected,
  isHovered = false,
  isDragging = false,
}: PhotoCardProps) {
  const thumbnailUrl = `${photo.url}?width=400&height=400&resize=cover`;

  return (
    <div
      className={clsx(
        'cursor-grab active:cursor-grabbing overflow-hidden transition-all',
        isSelected
          ? 'ring-2 ring-primary ring-offset-2'
          : isHovered
            ? 'ring-2 ring-primary/50 ring-offset-1 [&>div>div]:opacity-80'
            : 'hover:ring-2 hover:ring-primary/50',
        isDragging && 'opacity-50',
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
