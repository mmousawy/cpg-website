'use client';

import type { AlbumWithPhotos } from '@/types/albums';
import clsx from 'clsx';
import Image from 'next/image';

interface AlbumCardProps {
  album: AlbumWithPhotos;
  isSelected?: boolean;
  isHovered?: boolean;
}

export default function AlbumCard({
  album,
  isSelected = false,
  isHovered = false,
}: AlbumCardProps) {
  const coverImage = album.cover_image_url || album.photos?.[0]?.photo_url || '/placeholder-album.jpg';
  const photoCount = album.photos?.length || 0;

  return (
    <div
      className={clsx(
        'cursor-pointer overflow-hidden bg-background-light transition-all',
        isSelected
          ? 'ring-2 ring-primary ring-offset-2'
          : isHovered
            ? 'ring-2 ring-primary/50 ring-offset-1'
            : 'hover:ring-2 hover:ring-primary/50',
      )}
    >
      {/* Cover image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-background">
        <Image
          src={coverImage}
          alt={album.title}
          fill
          sizes="250px"
          quality={85}
          className="object-cover"
          draggable={false}
        />

        {/* Private badge */}
        {!album.is_public && (
          <div className="absolute top-2 right-8">
            <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-200">
              Private
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
    </div>
  );
}
