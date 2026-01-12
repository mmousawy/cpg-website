'use client';

import type { Photo, PhotoWithAlbums } from '@/types/photos';
import clsx from 'clsx';
import Image from 'next/image';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import MagnifyingGlassPlusSVG from 'public/icons/magnifying-glass-plus.svg';
import { useEffect, useRef } from 'react';

/** Get display name for a photo: title -> original_filename -> short id */
export function getPhotoDisplayName(photo: Photo | PhotoWithAlbums): string {
  if (photo.title) return photo.title;
  if (photo.original_filename) return photo.original_filename;
  return photo.short_id || photo.id.slice(0, 8);
}

/** Format file size in human readable format */
function formatFileSize(bytes: number | null | undefined): string | null {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format date in user-friendly format */
function formatDate(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export type PhotoListItemVariant = 'compact' | 'detailed';

interface PhotoListItemProps {
  photo: Photo | PhotoWithAlbums;
  /** 'compact' shows thumbnail + name + resolution, 'detailed' shows all metadata */
  variant?: PhotoListItemVariant;
  className?: string;
}

/**
 * Reusable photo list item component.
 * - Compact: Thumbnail, name, resolution
 * - Detailed: Thumbnail, name, filename, id, resolution, file size, upload date
 * Includes hover state with magnifying glass to view full size in PhotoSwipe.
 */
export default function PhotoListItem({
  photo,
  variant = 'compact',
  className = '',
}: PhotoListItemProps) {
  const displayName = getPhotoDisplayName(photo);
  const isDetailed = variant === 'detailed';
  const lightboxRef = useRef<PhotoSwipeLightbox | null>(null);

  // Initialize PhotoSwipe lightbox
  useEffect(() => {
    const dataSource = [{
      src: photo.url,
      width: photo.width || 1200,
      height: photo.height || 800,
    }];

    lightboxRef.current = new PhotoSwipeLightbox({
      dataSource,
      pswpModule: () => import('photoswipe'),
      showHideAnimationType: 'fade',
    });

    lightboxRef.current.init();

    return () => {
      lightboxRef.current?.destroy();
      lightboxRef.current = null;
    };
  }, [photo.url, photo.width, photo.height]);

  const handleViewFullSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    lightboxRef.current?.loadAndOpen(0);
  };

  return (
    <div className={`flex items-start gap-2 border border-border-color bg-background-medium p-0 ${className}`}>
      <div
        className={clsx(
          'group/thumb relative shrink-0 overflow-hidden bg-background cursor-pointer',
          variant === 'compact' ? 'size-12' : 'size-16',
        )}
        onClick={handleViewFullSize}
        title="View full size"
      >
        <Image
          src={photo.url}
          alt={displayName}
          fill
          className="object-cover transition-transform group-hover/thumb:scale-105"
          sizes="64px"
        />
        {/* Hover overlay with magnifying glass */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover/thumb:opacity-100">
          <MagnifyingGlassPlusSVG className="size-5 text-white drop-shadow-md" />
        </div>
      </div>
      <div className="min-w-0 flex-1 py-1 pr-2">
        {/* Primary name (title or fallback) */}
        <p className="line-clamp-2 text-sm font-medium leading-none" title={displayName}>
          {displayName}
        </p>

        {isDetailed ? (
          <div className="flex flex-wrap gap-1 text-xs text-foreground/50 mt-0.5">
            <p className="flex flex-wrap gap-1">
              {photo.original_filename && (
                <span className="max-w-40 overflow-hidden text-ellipsis whitespace-nowrap inline-block">{photo.original_filename}</span>
              )}
              {photo.created_at && formatDate(photo.created_at) && (
                <span> • {formatDate(photo.created_at)}</span>
              )}
              <span className="grid-row-start-2">{photo.width} × {photo.height}</span>
              {formatFileSize(photo.file_size) && (
                <span>• {formatFileSize(photo.file_size)}</span>
              )}
              <span>ID: {photo.short_id || photo.id.slice(0, 8)}</span>
            </p>
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}
