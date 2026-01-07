'use client';

import { useEffect, useRef } from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import Button from '@/components/shared/Button';
import ExpandSVG from 'public/icons/expand.svg';

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
      icon={<ExpandSVG className="size-4" />}
      onClick={() => {
        lightboxRef.current?.loadAndOpen(0);
      }}
    >
      Full size gallery
    </Button>
  );
}

