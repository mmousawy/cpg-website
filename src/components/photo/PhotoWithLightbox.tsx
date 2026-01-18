'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { initPhotoSwipe, type PhotoSwipeLightboxInstance } from '@/utils/photoswipe';

interface PhotoWithLightboxProps {
  url: string;
  title?: string | null;
  width: number;
  height: number;
}

/**
 * Photo that opens in PhotoSwipe lightbox when clicked
 */
export default function PhotoWithLightbox({
  url,
  title,
  width,
  height,
}: PhotoWithLightboxProps) {
  useEffect(() => {
    let lightbox: PhotoSwipeLightboxInstance | null = null;

    initPhotoSwipe().then((PhotoSwipeLightbox) => {
      lightbox = new PhotoSwipeLightbox({
        gallery: '#single-photo-gallery',
        children: 'a',
        pswpModule: () => import('photoswipe'),
        showHideAnimationType: 'zoom',
      });

      lightbox.init();
    });

    return () => {
      if (lightbox) {
        lightbox.destroy();
      }
    };
  }, []);

  return (
    <div
      id="single-photo-gallery"
      className="relative w-full overflow-hidden bg-background-light"
    >
      <a
        href={url}
        data-pswp-width={width}
        data-pswp-height={height}
        target="_blank"
        rel="noreferrer"
      >
        <Image
          src={url}
          alt={title || 'Photo'}
          width={width}
          height={height}
          className="w-full h-auto object-contain cursor-zoom-in"
          sizes="100vw"
          priority
          unoptimized={true}
        />
      </a>
    </div>
  );
}
