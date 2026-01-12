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
  const isOpeningRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lightboxRef.current) {
        try {
          lightboxRef.current.destroy();
        } catch (error) {
          // Ignore errors during cleanup
        }
        lightboxRef.current = null;
      }
    };
  }, []);

  const handleViewFullSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Prevent multiple simultaneous opens
    if (isOpeningRef.current || lightboxRef.current) {
      return;
    }

    try {
      isOpeningRef.current = true;

      // Create data source
      const dataSource = [{
        src: photo.url,
        width: photo.width || 1200,
        height: photo.height || 800,
      }];

      // Create and initialize lightbox lazily
      const lightbox = new PhotoSwipeLightbox({
        dataSource,
        pswpModule: () => import('photoswipe'),
        showHideAnimationType: 'fade',
      });

      // Clean up lightbox when it closes
      lightbox.on('close', () => {
        if (lightboxRef.current === lightbox) {
          try {
            lightboxRef.current.destroy();
          } catch {
            // Ignore cleanup errors
          }
          lightboxRef.current = null;
          isOpeningRef.current = false;
        }
      });

      lightbox.init();
      lightboxRef.current = lightbox;

      // Open the lightbox
      lightbox.loadAndOpen(0);
    } catch (error) {
      console.error('Failed to open lightbox:', error);
      isOpeningRef.current = false;
      if (lightboxRef.current) {
        try {
          lightboxRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
        lightboxRef.current = null;
      }
    }
  };

  return (
    <div className={`flex items-start gap-2 border border-border-color bg-background-medium p-0 ${className}`}>
      <div
        className={clsx(
          'group/thumb relative shrink-0 overflow-hidden bg-background cursor-pointer',
          variant === 'compact' ? 'size-12' : 'size-18',
        )}
        onClick={handleViewFullSize}
        title="View full size"
      >
        <Image
          src={photo.url}
          alt={displayName}
          fill
          className="object-cover transition-transform group-hover/thumb:scale-105"
          sizes="128px"
        />
        {/* Hover overlay with magnifying glass */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover/thumb:opacity-100">
          <MagnifyingGlassPlusSVG className="size-5 text-white drop-shadow-md" />
        </div>
      </div>
      <div className="min-w-0 flex-1 py-1 pr-2 space-y-0.5">
        {/* Primary name (title or fallback) */}
        <p className="line-clamp-2 text-sm font-medium leading-tight" title={displayName}>
          {displayName}
        </p>

        {isDetailed && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-0 text-[11px] leading-tight text-foreground/50">
            {photo.original_filename && (
              <div className="col-span-2 truncate">
                <span className="text-foreground/60">Filename:</span>{' '}
                <span title={photo.original_filename}>{photo.original_filename}</span>
              </div>
            )}
            {photo.created_at && formatDate(photo.created_at) && (
              <div className="truncate">
                <span className="text-foreground/60">Date:</span>{' '}
                {formatDate(photo.created_at)}
              </div>
            )}
            <div className="truncate">
              <span className="text-foreground/60">Dimensions:</span>{' '}
              {photo.width} × {photo.height}
            </div>
            {formatFileSize(photo.file_size) && (
              <div className="truncate">
                <span className="text-foreground/60">Size:</span>{' '}
                {formatFileSize(photo.file_size)}
              </div>
            )}
            <div className="truncate">
              <span className="text-foreground/60">ID:</span>{' '}
              {photo.short_id || photo.id.slice(0, 8)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
