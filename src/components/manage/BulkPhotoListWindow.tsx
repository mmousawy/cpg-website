'use client';

import type { PhotoWithAlbums } from '@/types/photos';
import { useCallback, useEffect, useRef, useState } from 'react';
import PhotoListItem from './PhotoListItem';

/** Fixed row height for detailed PhotoListItem (72px thumb + border + spacing). */
export const BULK_PHOTO_LIST_ROW_HEIGHT = 76;
const OVERSCAN_ROWS = 2;

interface BulkPhotoListWindowProps {
  photos: PhotoWithAlbums[];
  getPhotoPageUrl: (photo: PhotoWithAlbums) => string | undefined;
  className?: string;
}

export default function BulkPhotoListWindow({
  photos,
  getPhotoPageUrl,
  className = 'mb-6 max-h-48 overflow-y-auto',
}: BulkPhotoListWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(192);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeight = () => setContainerHeight(el.clientHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  if (photos.length === 0) {
    return null;
  }

  const totalHeight = photos.length * BULK_PHOTO_LIST_ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / BULK_PHOTO_LIST_ROW_HEIGHT) - OVERSCAN_ROWS);
  const visibleCount = Math.ceil(containerHeight / BULK_PHOTO_LIST_ROW_HEIGHT) + OVERSCAN_ROWS * 2;
  const endIndex = Math.min(photos.length, startIndex + visibleCount);

  return (
    <div
      ref={containerRef}
      className={className}
      onScroll={handleScroll}
    >
      <div
        style={{ height: totalHeight, position: 'relative' }}
      >
        {photos.slice(startIndex, endIndex).map((photo, index) => {
          const rowIndex = startIndex + index;
          return (
            <div
              key={photo.id}
              className="absolute inset-x-0"
              style={{
                top: rowIndex * BULK_PHOTO_LIST_ROW_HEIGHT,
                height: BULK_PHOTO_LIST_ROW_HEIGHT,
              }}
            >
              <PhotoListItem
                photo={photo}
                variant="detailed"
                photoPageUrl={getPhotoPageUrl(photo)}
                noBlur
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
