'use client';

import Image from 'next/image';
import clsx from 'clsx';
import type { Photo } from '@/types/photos';

interface PhotoCardProps {
  photo: Photo;
  isSelected: boolean;
  onSelect: (photoId: string, isMultiSelect: boolean) => void;
  onClick?: () => void;
}

export default function PhotoCard({
  photo,
  isSelected,
  onSelect,
  onClick,
}: PhotoCardProps) {
  const thumbnailUrl = `${photo.url}?width=400&height=400&resize=cover`;

  return (
    <div
      className={clsx(
        'group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all',
        isSelected
          ? 'border-primary ring-2 ring-primary ring-offset-2'
          : 'border-border-color hover:border-primary/50'
      )}
      onClick={(e) => {
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          e.stopPropagation();
          onSelect(photo.id, true);
        } else {
          onClick?.();
        }
      }}
    >
      {/* Checkbox overlay */}
      <div
        className={clsx(
          'absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded border-2 bg-background transition-all',
          isSelected
            ? 'border-primary bg-primary text-white'
            : 'border-white/80 bg-white/60 opacity-0 group-hover:opacity-100'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(photo.id, false);
        }}
      >
        {isSelected && (
          <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>

      {/* Image */}
      <div className="aspect-square overflow-hidden bg-background-light">
              {photo.blurhash ? (
                <Image
                  src={thumbnailUrl}
                  alt={photo.title || 'Photo'}
                  width={400}
                  height={400}
                  className="size-full object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              ) : (
          <Image
            src={thumbnailUrl}
            alt={photo.title || 'Photo'}
            width={400}
            height={400}
            className="size-full object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        )}
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

