'use client';

import BlurImage from '@/components/shared/BlurImage';
import type { Photo, PhotoWithAlbums } from '@/types/photos';
import { formatAperture, formatExposure, formatFocalLength, formatISO } from '@/utils/exif';
import { initPhotoSwipe, type PhotoSwipeLightboxInstance } from '@/utils/photoswipe';
import { getSquareThumbnailUrl } from '@/utils/supabaseImageLoader';
import clsx from 'clsx';
import MagnifyingGlassPlusSVG from 'public/icons/magnifying-glass-plus.svg';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Get display name for a photo: title (short_id) -> short_id */
export function getPhotoDisplayName(photo: Photo | PhotoWithAlbums): string {
  if (photo.title) {
    return photo.title;
  }
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

/** Format EXIF data for display - uses unified exif utilities */
function formatExifValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '';

  // Handle dates
  if (key === 'DateTimeOriginal' && typeof value === 'string') {
    try {
      const date = new Date(value);
      return date.toLocaleString();
    } catch {
      return String(value);
    }
  }

  // Handle numbers with proper formatting
  if (typeof value === 'number') {
    if (key === 'ExposureTime') {
      return formatExposure(value);
    }
    if (key === 'FNumber') {
      return formatAperture(value);
    }
    if (key === 'FocalLength') {
      return formatFocalLength(value);
    }
    if (key === 'ISO') {
      return formatISO(value);
    }
    if (key === 'GPSLatitude' || key === 'GPSLongitude') {
      return value.toFixed(6);
    }
    return String(value);
  }

  return String(value);
}

/** Get human-readable label for EXIF key */
function getExifLabel(key: string): string {
  const labels: Record<string, string> = {
    Make: 'Camera Make',
    Model: 'Camera Model',
    DateTimeOriginal: 'Date Taken',
    ExposureTime: 'Exposure',
    FNumber: 'Aperture',
    ISO: 'ISO',
    FocalLength: 'Focal Length',
    LensModel: 'Lens',
    GPSLatitude: 'Latitude',
    GPSLongitude: 'Longitude',
  };
  return labels[key] || key;
}

/** Info Icon SVG Component */
function InfoIconSVG({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="20px"
      viewBox="0 0 24 24"
      width="20px"
      fill="currentColor"
      className={className}
    >
      <path
        d="M0 0h24v24H0z"
        fill="none"
      />
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
      />
    </svg>
  );
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
  const lightboxRef = useRef<PhotoSwipeLightboxInstance | null>(null);
  const isOpeningRef = useRef(false);
  const [showExif, setShowExif] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; right: number } | null>(null);
  const exifData = photo.exif_data as Record<string, unknown> | null | undefined;
  const hasExif = exifData && Object.keys(exifData).length > 0;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  // Update popover position on scroll/resize and handle click outside
  useEffect(() => {
    if (!showExif || !buttonRef.current || !popoverPosition) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + 4, // 4px gap
        right: window.innerWidth - rect.right,
      });
    };

    // Update position on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setShowExif(false);
      }
    };

    // Use setTimeout to avoid immediate close on button click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [showExif, popoverPosition]);

  // Reset position when popover is closed
  useEffect(() => {
    if (!showExif) {
      setPopoverPosition(null);
    }
  }, [showExif]);

  const handleViewFullSize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Prevent multiple simultaneous opens
    if (isOpeningRef.current || lightboxRef.current) {
      return;
    }

    try {
      isOpeningRef.current = true;

      // Lazy load PhotoSwipe
      const PhotoSwipeLightbox = await initPhotoSwipe();

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

  // Check if className overrides items alignment
  const hasItemsOverride = className.includes('items-center') || className.includes('items-end');
  const baseClasses = clsx(
    'flex gap-2 border border-border-color bg-background-medium p-0',
    hasItemsOverride ? '' : 'items-start',
    className,
  );

  return (
    <div
      className={baseClasses}
    >
      <div
        className={clsx(
          'group/thumb relative shrink-0 overflow-hidden bg-background cursor-pointer',
          variant === 'compact' ? 'size-12' : 'size-18',
        )}
        onClick={handleViewFullSize}
        title="View full size"
      >
        <BlurImage
          src={getSquareThumbnailUrl(photo.url, variant === 'compact' ? 48 : 72, 85) || photo.url}
          alt={displayName}
          blurhash={photo.blurhash}
          fill
          className="object-cover transition-transform group-hover/thumb:scale-105"
          sizes="128px"
        />
        {/* Hover overlay with magnifying glass */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover/thumb:opacity-100"
        >
          <MagnifyingGlassPlusSVG
            className="size-5 text-white drop-shadow-md"
          />
        </div>
      </div>
      <div
        className="min-w-0 flex-1 py-1 pr-1 space-y-0.5 relative"
      >
        {/* Primary name (title or fallback) */}
        <div
          className="flex items-start justify-between gap-2"
        >
          <p
            className="line-clamp-2 text-sm font-medium leading-tight flex-1"
            title={displayName}
          >
            {displayName}
          </p>
          {/* EXIF Info Button - only in detailed view */}
          {isDetailed && hasExif && (
            <>
              <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!showExif && buttonRef.current) {
                    // Calculate position before showing popover to prevent flash
                    const rect = buttonRef.current.getBoundingClientRect();
                    setPopoverPosition({
                      top: rect.bottom + 4, // 4px gap
                      right: window.innerWidth - rect.right,
                    });
                    setShowExif(true);
                  } else {
                    setShowExif(false);
                  }
                }}
                className="p-0.5 rounded hover:bg-foreground/10 transition-colors text-foreground/60 hover:text-foreground shrink-0"
                title="View EXIF data"
                aria-label="View EXIF data"
              >
                <InfoIconSVG
                  className="size-3.5"
                />
              </button>

              {/* EXIF Popover - rendered via portal outside scroll container */}
              {showExif &&
                popoverPosition &&
                typeof window !== 'undefined' &&
                createPortal(
                  <div
                    ref={popoverRef}
                    className="fixed z-100 w-64 bg-background-light border border-border-color rounded-lg shadow-lg p-2 max-h-96 overflow-y-auto"
                    style={{
                      top: `${popoverPosition.top}px`,
                      right: `${popoverPosition.right}px`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h4
                      className="text-xs font-semibold mb-1.5 text-foreground/80"
                    >
                      Photo EXIF Data
                    </h4>
                    <div
                      className="table text-[11px]"
                    >
                      {Object.entries(exifData).map(([key, value]) => {
                        const formattedValue = formatExifValue(key, value);
                        if (!formattedValue) return null;
                        return (
                          <div
                            className="table-row"
                            key={key}
                          >
                            <span
                              className="table-cell text-foreground/60 font-medium pr-1 pt-0.5 whitespace-nowrap"
                            >
                              {getExifLabel(key)}
                              :
                            </span>
                            <span
                              className="table-cell text-foreground/80 truncate pt-0.5"
                            >
                              {formattedValue}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>,
                  document.body,
                )}
            </>
          )}
        </div>

        <div
          className="grid grid-cols-2 gap-x-2 gap-y-0 text-[11px] leading-tight text-foreground/60"
        >
          {photo.created_at && formatDate(photo.created_at) && (
            <div
              className={isDetailed ? 'truncate' : 'col-span-2 truncate'}
            >
              {formatDate(photo.created_at)}
            </div>
          )}
          {isDetailed && (
            <>
              <div
                className="truncate"
              >
                {photo.width}
                {' '}
                ×
                {photo.height}
              </div>
              {formatFileSize(photo.file_size) && (
                <div
                  className="truncate"
                >
                  {formatFileSize(photo.file_size)}
                </div>
              )}
              <div
                className="truncate"
              >
                <span
                  className="text-foreground/60"
                >
                  ID:
                </span>
                {' '}
                {photo.short_id || photo.id.slice(0, 8)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
