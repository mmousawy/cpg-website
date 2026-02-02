'use client';

import { initPhotoSwipe, type PhotoSwipeLightboxInstance } from '@/utils/photoswipe';
import { useEffect, useMemo, useRef, useState } from 'react';

import BlurImage from '@/components/shared/BlurImage';
import MagnifyingGlassPlusSVG from 'public/icons/magnifying-glass-plus.svg';

const MAX_SIZE_DESKTOP = 256;

interface ChallengeCoverImageProps {
  url: string;
  title: string;
  blurhash?: string | null;
}

/**
 * Challenge cover image that opens in PhotoSwipe lightbox when clicked
 */
export default function ChallengeCoverImage({
  url,
  title,
  blurhash,
}: ChallengeCoverImageProps) {
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
        gallery: '.challenge-cover-gallery',
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

  const imageContent = (
    <a
      href={url}
      data-pswp-width={dimensions.width}
      data-pswp-height={dimensions.height}
      target="_blank"
      rel="noreferrer"
    >
      <BlurImage
        src={url}
        alt={title}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, 256px"
        preload
        blurhash={blurhash}
      />
      {/* Zoom icon on hover */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
      >
        <MagnifyingGlassPlusSVG
          className="h-8 w-8 fill-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
        />
      </div>
    </a>
  );

  return (
    <>
      {/* Mobile: full width, fixed height at top */}
      <div
        className="challenge-cover-gallery sm:hidden relative rounded-xl overflow-hidden bg-background-medium mb-4 group cursor-zoom-in w-full h-40"
      >
        {imageContent}
      </div>
      {/* Desktop: floated right with dynamic size */}
      <div
        className="challenge-cover-gallery hidden sm:block relative rounded-xl overflow-hidden bg-background-medium float-right ml-4 mb-4 group cursor-zoom-in"
        style={{ width: desktopSize.width, height: desktopSize.height }}
      >
        {imageContent}
      </div>
    </>
  );
}
