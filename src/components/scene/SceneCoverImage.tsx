'use client';

import { initPhotoSwipe, type PhotoSwipeLightboxInstance } from '@/utils/photoswipe';
import { useEffect, useMemo, useRef, useState } from 'react';

import BlurImage from '@/components/shared/BlurImage';
import MagnifyingGlassPlusSVG from 'public/icons/magnifying-glass-plus.svg';

const MAX_WIDTH_DESKTOP = 200;
const MAX_HEIGHT_DESKTOP = 140;

interface SceneCoverImageProps {
  url: string;
  title: string;
  blurhash?: string | null;
}

export default function SceneCoverImage({
  url,
  title,
  blurhash,
}: SceneCoverImageProps) {
  const lightboxRef = useRef<PhotoSwipeLightboxInstance | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  }, [url]);

  const desktopSize = useMemo(() => {
    const { width, height } = dimensions;
    const scale = Math.min(
      MAX_WIDTH_DESKTOP / width,
      MAX_HEIGHT_DESKTOP / height,
    );
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    };
  }, [dimensions]);

  useEffect(() => {
    initPhotoSwipe().then((PhotoSwipeLightbox) => {
      lightboxRef.current = new PhotoSwipeLightbox({
        gallery: '.scene-cover-gallery',
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
        sizes="(max-width: 640px) 100vw, 200px"
        blurhash={blurhash}
      />
      <div
        className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
      >
        <MagnifyingGlassPlusSVG
          className="h-6 w-6 fill-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
        />
      </div>
    </a>
  );

  return (
    <>
      {/* Mobile: full width, compact height */}
      <div
        className="scene-cover-gallery sm:hidden relative rounded-md overflow-hidden bg-background-medium border border-border-color mb-4 group cursor-zoom-in w-full h-32"
      >
        {imageContent}
      </div>
      {/* Desktop: floated right, compact */}
      <div
        className="scene-cover-gallery hidden sm:block relative rounded-lg overflow-hidden bg-background-medium border border-border-color float-right ml-4 mb-2 group cursor-zoom-in"
        style={{ width: desktopSize.width, height: desktopSize.height }}
      >
        {imageContent}
      </div>
    </>
  );
}
