'use client';

import { useProgressRouter } from '@/components/layout/NavigationProgress';
import { initPhotoSwipe, type PhotoSwipeLightboxInstance } from '@/utils/photoswipe';
import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import BlurImage from '../shared/BlurImage';
import LoadingSpinner from '../shared/LoadingSpinner';

function keepLightboxKeysOffThePage(lightbox: PhotoSwipeLightboxInstance) {
  lightbox.on('keydown', (event) => {
    event.originalEvent.stopPropagation();
  });
}

type GalleryPhoto = {
  shortId: string;
  url: string;
  width: number;
  height: number;
};

type PhotoWithLightboxProps = {
  url: string;
  title: string;
  width: number;
  height: number;
  blurhash: string;
  isInAlbum?: boolean;
  galleryPhotos?: GalleryPhoto[];
  currentShortId?: string;
  /** Album context: owner nickname */
  nickname?: string;
  /** Album context: album slug */
  albumSlug?: string;
  /** Event/challenge context: base path (e.g. /events/my-event) */
  basePath?: string;
};

export default function PhotoWithLightbox({
  url,
  title,
  width,
  height,
  blurhash,
  isInAlbum = false,
  galleryPhotos,
  currentShortId,
  nickname,
  albumSlug,
  basePath,
}: PhotoWithLightboxProps) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const imageAnchorRef = useRef<HTMLAnchorElement>(null);
  const lightboxRef = useRef<PhotoSwipeLightboxInstance | null>(null);
  const initialIndexRef = useRef(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const router = useProgressRouter();

  const hasGallery = !!galleryPhotos && galleryPhotos.length > 1;

  const getPageImage = useCallback(() => (
    imageAnchorRef.current?.querySelector('img')
  ), []);

  const imageUrlsMatch = useCallback((a: string, b: string) => {
    if (a === b) return true;
    try {
      return new URL(a, window.location.origin).href === new URL(b, window.location.origin).href;
    } catch {
      return false;
    }
  }, []);

  const getPhotoHref = useCallback((shortId: string) => (
    basePath
      ? `${basePath}/photo/${shortId}`
      : `/@${nickname}/album/${albumSlug}/photo/${shortId}`
  ), [basePath, nickname, albumSlug]);

  // Single-image mode: bind PhotoSwipe to the visible anchor
  useEffect(() => {
    if (hasGallery || !galleryRef.current) return;

    let mounted = true;

    initPhotoSwipe().then((PhotoSwipeLightbox) => {
      if (!mounted || !galleryRef.current) return;

      const lightbox = new PhotoSwipeLightbox({
        gallery: galleryRef.current,
        children: 'a',
        pswpModule: () => import('photoswipe'),
        showHideAnimationType: 'zoom',
      });

      keepLightboxKeysOffThePage(lightbox);
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
  }, [hasGallery]);

  // Multi-image mode: programmatic dataSource gallery with navigation on close
  useEffect(() => {
    if (!hasGallery || !galleryPhotos) return;

    let mounted = true;

    initPhotoSwipe().then((PhotoSwipeLightbox) => {
      if (!mounted) return;

      const dataSource = galleryPhotos.map((photo) => ({
        src: photo.url,
        width: photo.width || 1200,
        height: photo.height || 800,
      }));

      const lightbox = new PhotoSwipeLightbox({
        dataSource,
        pswpModule: () => import('photoswipe'),
        showHideAnimationType: 'zoom',
      });

      keepLightboxKeysOffThePage(lightbox);

      lightbox.addFilter('itemData', (itemData, index) => {
        if (index !== initialIndexRef.current || !imageAnchorRef.current) {
          return itemData;
        }

        const pageImg = imageAnchorRef.current.querySelector('img');
        return {
          ...itemData,
          element: imageAnchorRef.current,
          msrc: pageImg ? (pageImg.currentSrc || pageImg.src) : itemData.msrc,
          alt: pageImg?.alt || itemData.alt,
        };
      });

      lightbox.on('contentLoadImage', (event) => {
        const pageImg = getPageImage();
        if (!pageImg?.complete) return;

        const pageSrc = pageImg.currentSrc || pageImg.src;
        if (!imageUrlsMatch(pageSrc, event.content.data.src || '')) return;

        event.preventDefault();
        const img = event.content.element as HTMLImageElement | undefined;
        if (!img) return;

        img.src = pageSrc;
        img.alt = pageImg.alt;

        if (img.complete) {
          event.content.onLoaded();
        } else {
          img.onload = () => event.content.onLoaded();
          img.onerror = () => event.content.onError();
        }
      });

      lightbox.on('closingAnimationStart', () => {
        const pswp = lightbox.pswp;
        if (!pswp) return;
        if (pswp.currIndex !== initialIndexRef.current) {
          pswp.options.showHideAnimationType = 'fade';
        } else {
          pswp.options.showHideAnimationType = 'zoom';
        }
      });

      lightbox.on('close', () => {
        const pswp = lightbox.pswp;
        if (!pswp || !currentShortId) return;

        const closedPhoto = galleryPhotos[pswp.currIndex];
        if (closedPhoto && closedPhoto.shortId !== currentShortId) {
          router.replace(getPhotoHref(closedPhoto.shortId));
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
  }, [hasGallery, galleryPhotos, currentShortId, getPhotoHref, router, getPageImage, imageUrlsMatch]);

  const openGallery = useCallback((index: number, initialPoint?: { x: number; y: number } | null) => {
    initialIndexRef.current = index;
    lightboxRef.current?.loadAndOpen(index, undefined, initialPoint ?? null);
  }, []);

  const handleImageClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!hasGallery || !galleryPhotos || !currentShortId) return;

    event.preventDefault();
    const index = galleryPhotos.findIndex((photo) => photo.shortId === currentShortId);
    const initialPoint = event.clientX || event.clientY
      ? { x: event.clientX, y: event.clientY }
      : null;
    openGallery(index >= 0 ? index : 0, initialPoint);
  }, [hasGallery, galleryPhotos, currentShortId, openGallery]);

  // Show spinner after 200ms delay (avoid flash for fast loads)
  useEffect(() => {
    if (isLoaded) return;

    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  return (
    <div
      id="gallery"
      className="flex w-full text-center relative"
      ref={galleryRef}
    >
      {/* Loading spinner - shows after 200ms, fades out when loaded */}
      <div
        className={clsx(
          'absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-300',
          showSpinner && !isLoaded ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div
          className="rounded-full bg-black/40 dark:bg-black/60 p-2 shadow-lg backdrop-blur-sm"
        >
          <LoadingSpinner
            className="border-white/90 border-t-transparent border-[3px] size-6!"
          />
        </div>
      </div>

      <a
        ref={imageAnchorRef}
        href={url}
        data-pswp-src={url}
        data-pswp-width={width}
        data-pswp-height={height}
        onClick={hasGallery ? handleImageClick : undefined}
        className="m-auto cursor-zoom-in!"
      >
        <BlurImage
          src={url}
          alt={title}
          width={width}
          height={height}
          blurhash={blurhash}
          contain
          unoptimized
          onLoad={() => setIsLoaded(true)}
          className={clsx(
            isInAlbum ? 'max-h-[calc(100vh-154px)] sm:max-h-[calc(100vh-172px)] lg:max-h-[calc(100vh-218px)]'
                      : 'max-h-[calc(100vh-90px)] sm:max-h-[calc(100vh-106px)] lg:max-h-[calc(100vh-138px)] ',
          )}
          style={{
            aspectRatio: `${width}/${height}`,
          }}
        />
      </a>
    </div>
  );
}
