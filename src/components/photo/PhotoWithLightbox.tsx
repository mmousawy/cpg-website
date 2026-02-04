'use client';

import { initPhotoSwipe, type PhotoSwipeLightboxInstance } from '@/utils/photoswipe';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { blurhashToDataURL, getBlurhashDimensions } from '@/utils/decodeBlurhash';

interface PhotoWithLightboxProps {
  url: string;
  title?: string | null;
  width: number;
  height: number;
  blurhash?: string | null;
}

/**
 * Photo that opens in PhotoSwipe lightbox when clicked.
 * Container is sized to the photo's aspect ratio, constrained by available width and max viewport height.
 * If photo is shorter than viewport, the container shrinks to fit.
 */
export default function PhotoWithLightbox({
  url,
  title,
  width,
  height,
  blurhash,
}: PhotoWithLightboxProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate the optimal photo size based on available width and max viewport height
  const calculateSize = useCallback(() => {
    if (!containerRef.current) return;

    const windowWidth = window.innerWidth;
    const isMobile = windowWidth < 768;
    const isTablet = windowWidth >= 768 && windowWidth < 1024;

    // Calculate available width:
    // Mobile: use container width (full width minus padding)
    // Tablet: viewport width minus sidebar (384px) minus gap (16px) minus horizontal padding (32px)
    // Desktop: viewport width minus sidebar (384px) minus gap (32px) minus horizontal padding (64px)
    const containerWidth = containerRef.current.clientWidth;
    const maxWidthTablet = windowWidth - 384 - 16 - 32; // sidebar + gap + p-4 padding
    const maxWidthDesktop = windowWidth - 384 - 32 - 64; // sidebar + gap + p-8 padding
    const availableWidth = isMobile
      ? containerWidth
      : Math.min(containerWidth, isTablet ? maxWidthTablet : maxWidthDesktop);

    // Max height - calculate directly from viewport:
    // Mobile: viewport minus header (56px) minus top padding (16px) minus bottom space for sidebar gap (32px) = vh - 104px
    // Tablet: viewport minus top (90px = 74px header + 16px p-4) minus bottom (16px) = vh - 106px
    // Desktop: viewport minus top (106px = 74px header + 32px p-8) minus bottom (32px) = vh - 138px
    const maxHeight = isMobile
      ? window.innerHeight - 104
      : isTablet
        ? window.innerHeight - 106
        : window.innerHeight - 138;

    const photoAspect = width / height;
    const parentAspect = availableWidth / maxHeight;

    let photoWidth: number;
    let photoHeight: number;

    // Compare aspect ratios to determine which dimension should be the constraint
    // This ensures the photo is as large as possible while fitting in the container
    if (photoAspect > parentAspect) {
      // Photo is wider relative to parent - width is the constraint
      photoWidth = availableWidth;
      photoHeight = availableWidth / photoAspect;
    } else {
      // Photo is taller relative to parent - height is the constraint
      photoHeight = maxHeight;
      photoWidth = maxHeight * photoAspect;
    }

    setContainerSize({ width: photoWidth, height: photoHeight });
  }, [width, height]);

  useEffect(() => {
    calculateSize();

    // Use ResizeObserver to watch parent container changes
    const resizeObserver = new ResizeObserver(() => {
      calculateSize();
    });

    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    // Also listen to window resize
    window.addEventListener('resize', calculateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateSize);
    };
  }, [calculateSize]);

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

  // Decode blurhash for placeholder with correct aspect ratio
  const blurhashDataUrl = useMemo(() => {
    if (!blurhash) return null;
    const dims = getBlurhashDimensions(width, height, 64);
    return blurhashToDataURL(blurhash, dims.width, dims.height);
  }, [blurhash, width, height]);

  return (
    <div
      ref={containerRef}
      id="single-photo-gallery"
      className="relative w-full h-full flex items-center justify-center"
    >
      {/* Photo container - sized to fit photo, constrained by available space */}
      {containerSize && (
        <div
          className="relative"
          style={{
            width: containerSize.width,
            height: containerSize.height,
          }}
        >
          <a
            href={url}
            data-pswp-width={width}
            data-pswp-height={height}
            target="_blank"
            rel="noreferrer"
            className="absolute inset-0 cursor-zoom-in"
          >
            {/* Blurhash placeholder - always rendered, photo fades in on top */}
            {blurhashDataUrl && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${blurhashDataUrl})`,
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                }}
                aria-hidden="true"
              />
            )}

            {/* Main image - fills the container exactly */}
            <Image
              src={url}
              alt={title || 'Photo'}
              fill
              className={`object-contain transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
              sizes="100vw"
              priority
              unoptimized={true}
              onLoad={() => setIsLoaded(true)}
            />
          </a>
        </div>
      )}
    </div>
  );
}
