'use client';

import { initPhotoSwipe, type PhotoSwipeLightboxInstance } from '@/utils/photoswipe';
import { useEffect, useRef, useState } from 'react';

import BlurImage from '@/components/shared/BlurImage';
import MagnifyingGlassPlusSVG from 'public/icons/magnifying-glass-plus.svg';

const DESKTOP_HEIGHT = 148;
const MOBILE_HEIGHT = 64;

interface SceneCoverImageProps {
  url: string;
  title: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
}

export default function SceneCoverImage({
  url,
  title,
  imageWidth,
  imageHeight,
}: SceneCoverImageProps) {
  const lightboxRef = useRef<PhotoSwipeLightboxInstance | null>(null);
  const [naturalDims, setNaturalDims] = useState<{ width: number; height: number } | null>(null);

  const w = imageWidth || naturalDims?.width || 400;
  const h = imageHeight || naturalDims?.height || 300;

  useEffect(() => {
    if (imageWidth && imageHeight) return;
    const img = new Image();
    img.onload = () => {
      setNaturalDims({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  }, [url, imageWidth, imageHeight]);

  const desktopWidth = Math.round((w / h) * DESKTOP_HEIGHT);
  const mobileWidth = Math.round((w / h) * MOBILE_HEIGHT);

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
      data-pswp-width={w}
      data-pswp-height={h}
      target="_blank"
      rel="noreferrer"
    >
      <BlurImage
        src={url}
        alt={title}
        fill
        className="object-cover"
        sizes={`(max-width: 640px) ${mobileWidth}px, ${desktopWidth}px`}
        noBlur={/\.png(\?|$)/i.test(url)}
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
      {/* Mobile: floated right, 52px tall, dynamic width */}
      <div
        className="scene-cover-gallery sm:hidden relative rounded-md overflow-hidden bg-white border border-border-color float-right ml-2 mb-1 group cursor-zoom-in"
        style={{ width: mobileWidth, height: MOBILE_HEIGHT }}
      >
        {imageContent}
      </div>
      {/* Desktop: floated right, 148px tall, dynamic width */}
      <div
        className="scene-cover-gallery hidden sm:block relative rounded-lg overflow-hidden bg-white border border-border-color float-right ml-4 mb-2 group cursor-zoom-in"
        style={{ width: desktopWidth, height: DESKTOP_HEIGHT }}
      >
        {imageContent}
      </div>
    </>
  );
}
