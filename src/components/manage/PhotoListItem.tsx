'use client';

import type { Photo, PhotoWithAlbums } from '@/types/photos';
import clsx from 'clsx';
import Image from 'next/image';

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
 */
export default function PhotoListItem({
  photo,
  variant = 'compact',
  className = '',
}: PhotoListItemProps) {
  const displayName = getPhotoDisplayName(photo);
  const isDetailed = variant === 'detailed';

  return (
    <div className={`flex items-center gap-2 border border-border-color bg-background-medium p-0 ${className}`}>
      <div className={clsx("relative shrink-0 overflow-hidden bg-background",
        variant === 'compact' ? 'size-12' : 'size-16',
      )}>
        <Image
          src={photo.url}
          alt={displayName}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>
      <div className="min-w-0 flex-1 py-1 pr-2">
        {/* Primary name (title or fallback) */}
        <p className="line-clamp-2 text-sm font-medium leading-none" title={displayName}>
          {displayName}
        </p>

        {isDetailed ? (
          <div className="flex flex-wrap gap-1 text-xs text-foreground/50 mt-0.5">
            <div className="flex flex-col">
              {photo.title && photo.original_filename && (
                <p className="flex gap-1">
                  <span>{photo.original_filename}</span>
                  {photo.created_at && formatDate(photo.created_at) && (
                    <span>• {formatDate(photo.created_at)}</span>
                  )}
                </p>
              )}
              <p className="flex gap-1">
                <span className="grid-row-start-2">{photo.width} × {photo.height}</span>
                {formatFileSize(photo.file_size) && (
                  <span>• {formatFileSize(photo.file_size)}</span>
                )}
                <span>ID: {photo.short_id || photo.id.slice(0, 8)}</span>
              </p>
            </div>
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}
