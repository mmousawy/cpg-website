'use client';

import Button from '@/components/shared/Button';
import { recordView } from '@/utils/recordView';
import { initPhotoSwipe, type PhotoSwipeLightboxInstance } from '@/utils/photoswipe';
import ExpandSVG from 'public/icons/expand.svg';
import { useEffect, useRef } from 'react';

interface PhotoItem {
  id: string;
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
  const lightboxRef = useRef<PhotoSwipeLightboxInstance | null>(null);

  useEffect(() => {
    if (!photos || photos.length === 0) return;

    let mounted = true;

    // Lazy load PhotoSwipe
    initPhotoSwipe().then((PhotoSwipeLightbox) => {
      if (!mounted) return;

      // Create data source for PhotoSwipe
      const dataSource = photos.map((photo) => ({
        src: photo.url,
        width: photo.width || 1200,
        height: photo.height || 800,
      }));

      const lightbox = new PhotoSwipeLightbox({
        dataSource,
        pswpModule: () => import('photoswipe'),
        showHideAnimationType: 'fade',
      });

      lightbox.on('change', () => {
        const pswp = lightbox.pswp;
        if (!pswp) return;
        const photo = photos[pswp.currIndex];
        if (photo?.id) {
          recordView('photo', photo.id);
        }
      });

      lightbox.init();
      lightboxRef.current = lightbox;
    });

    return () => {
      mounted = false;
      if (lightboxRef.current) {
        lightboxRef.current.destroy();
        lightboxRef.current = null;
      }
    };
  }, [photos]);

  if (!photos || photos.length === 0) return null;

  return (
    <Button
      variant="secondary"
      className={className}
      icon={<ExpandSVG
        className="size-4 -ml-1"
      />}
      onClick={() => {
        lightboxRef.current?.loadAndOpen(0);
      }}
    >
      View in gallery
    </Button>
  );
}
