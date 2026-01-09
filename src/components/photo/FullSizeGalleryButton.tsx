'use client';

import Button from '@/components/shared/Button';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import ExpandSVG from 'public/icons/expand.svg';
import { useEffect, useRef } from 'react';

interface PhotoItem {
  url: string;
  width: number | null;
  height: number | null;
}

interface FullSizeGalleryButtonProps {
  photos: PhotoItem[];
  className?: string;
}

/**
 * Button that opens a PhotoSwipe lightbox gallery
 */
export default function FullSizeGalleryButton({
  photos,
  className,
}: FullSizeGalleryButtonProps) {
  const lightboxRef = useRef<PhotoSwipeLightbox | null>(null);

  useEffect(() => {
    if (!photos || photos.length === 0) return;

    // Create data source for PhotoSwipe
    const dataSource = photos.map((photo) => ({
      src: photo.url,
      width: photo.width || 1200,
      height: photo.height || 800,
    }));

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
  }, [photos]);

  if (!photos || photos.length === 0) return null;

  return (
    <Button
      variant="secondary"
      className={className}
      icon={<ExpandSVG className="size-4 -ml-1" />}
      onClick={() => {
        lightboxRef.current?.loadAndOpen(0);
      }}
    >
      View full size gallery
    </Button>
  );
}
