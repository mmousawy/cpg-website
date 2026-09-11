'use client';

import { initPhotoSwipe, type PhotoSwipeLightboxInstance } from '@/utils/photoswipe';
import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';

import BlurImage from '@/components/shared/BlurImage';
import { getCroppedThumbnailUrl } from '@/utils/supabaseImageLoader';
import MagnifyingGlassPlusSVG from 'public/icons/magnifying-glass-plus.svg';

const MAX_SIZE_DESKTOP = 320;

interface EventCoverImageProps {
  url: string;
  title: string;
  blurhash?: string | null;
  isPast?: boolean;
}

/**
 * Event cover image that opens in PhotoSwipe lightbox when clicked
 */
export default function EventCoverImage({
  url,
  title,
  blurhash,
  isPast = false,
}: EventCoverImageProps) {
  const lightboxRef = useRef<PhotoSwipeLightboxInstance | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  // Load actual image dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  }, [url]);

  // Calculate display size for desktop (fits within MAX_SIZE_DESKTOP preserving aspect ratio)
  const desktopSize = useMemo(() => {
    const { width, height } = dimensions;
    const scale = Math.min(MAX_SIZE_DESKTOP / width, MAX_SIZE_DESKTOP / height);
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    };
  }, [dimensions]);

  useEffect(() => {
    initPhotoSwipe().then((PhotoSwipeLightbox) => {
      lightboxRef.current = new PhotoSwipeLightbox({
        gallery: '.event-cover-gallery',
        children: 'a',
        pswpModule: () => import('photoswipe'),
        showHideAnimationType: 'zoom',
      });

      lightboxRef.current.init();
    });

    return () => {
      if (lightboxRef.current) {
        lightboxRef.current.destroy();
        lightboxRef.current = null;
      }
    };
  }, []);

  const desktopSrc = getCroppedThumbnailUrl(url, desktopSize.width * 2, desktopSize.height * 2) || url;

  return (
    <div
      className="event-cover-gallery hidden sm:block relative overflow-hidden bg-background-medium float-right ml-6 mb-6 -mt-6 -mr-6 group cursor-zoom-in rounded-bl-xl rounded-tr-xl md:rounded-tr-2xl"
      style={{ width: desktopSize.width, height: desktopSize.height }}
    >
      <a
        href={url}
        data-pswp-width={dimensions.width}
        data-pswp-height={dimensions.height}
        target="_blank"
        rel="noreferrer"
        className="relative block h-full w-full"
      >
        <BlurImage
          src={desktopSrc}
          alt={title}
          fill
          className={clsx('object-cover', isPast && '')}
          sizes={`${MAX_SIZE_DESKTOP}px`}
          preload
          quality={92}
          blurhash={blurhash}
        />
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
        >
          <MagnifyingGlassPlusSVG
            className="h-8 w-8 fill-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
          />
        </div>
      </a>
    </div>
  );
}
