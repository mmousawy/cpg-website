'use client';

import { useProgressRouter } from '@/components/layout/NavigationProgress';
import { usePhotoLightboxOpen } from '@/context/PhotoLightboxOpenContext';
import { recordView } from '@/utils/recordView';
import { initPhotoSwipe, type PhotoSwipeLightboxInstance } from '@/utils/photoswipe';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BlurImage from '../shared/BlurImage';
import LoadingSpinner from '../shared/LoadingSpinner';
import type { PhotoMemberTag } from '@/lib/data/photoMemberTags';
import { PhotoMemberTagLayer } from './PhotoMemberTags';

function keepLightboxKeysOffThePage(lightbox: PhotoSwipeLightboxInstance) {
  lightbox.on('keydown', (event) => {
    event.originalEvent.stopPropagation();
  });
}

type GalleryPhoto = {
  id: string;
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
  /** When set, member spot-tag dots are shown on this photo (placement is only in Account → Photos). */
  photoId?: string;
  memberTags?: PhotoMemberTag[];
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
  photoId,
  memberTags,
}: PhotoWithLightboxProps) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const imageFrameRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<PhotoSwipeLightboxInstance | null>(null);
  const initialIndexRef = useRef(0);
  const skipInitialLightboxViewRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const router = useProgressRouter();
  const lightboxOpen = usePhotoLightboxOpen();

  const hasGallery = !!galleryPhotos && galleryPhotos.length > 1;

  const lightboxPhotos = useMemo((): GalleryPhoto[] => {
    if (hasGallery && galleryPhotos) {
      return galleryPhotos;
    }
    return [{
      id: photoId ?? 'current',
      shortId: currentShortId ?? '',
      url,
      width,
      height,
    }];
  }, [hasGallery, galleryPhotos, photoId, currentShortId, url, width, height]);

  const getPageImage = useCallback(() => (
    imageFrameRef.current?.querySelector('img')
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

  const getCurrentIndex = useCallback(() => {
    if (hasGallery && galleryPhotos && currentShortId) {
      const index = galleryPhotos.findIndex((photo) => photo.shortId === currentShortId);
      return index >= 0 ? index : 0;
    }
    return 0;
  }, [hasGallery, galleryPhotos, currentShortId]);

  // Programmatic dataSource gallery (single image or collection)
  useEffect(() => {
    let mounted = true;

    initPhotoSwipe().then((PhotoSwipeLightbox) => {
      if (!mounted) return;

      const dataSource = lightboxPhotos.map((photo) => ({
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
        if (index !== initialIndexRef.current || !imageFrameRef.current) {
          return itemData;
        }

        const pageImg = imageFrameRef.current.querySelector('img');
        return {
          ...itemData,
          element: imageFrameRef.current,
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

      lightbox.on('change', () => {
        const pswp = lightbox.pswp;
        if (!pswp) return;

        const photo = lightboxPhotos[pswp.currIndex];
        if (!photo?.id || photo.id === 'current') return;

        if (skipInitialLightboxViewRef.current && pswp.currIndex === initialIndexRef.current) {
          skipInitialLightboxViewRef.current = false;
          return;
        }

        recordView('photo', photo.id);
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
        if (!hasGallery) return;
        const pswp = lightbox.pswp;
        if (!pswp || !currentShortId || !galleryPhotos) return;

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
  }, [
    lightboxPhotos,
    hasGallery,
    galleryPhotos,
    currentShortId,
    getPhotoHref,
    router,
    getPageImage,
    imageUrlsMatch,
  ]);

  const openGallery = useCallback((index: number, initialPoint?: { x: number; y: number } | null) => {
    initialIndexRef.current = index;
    skipInitialLightboxViewRef.current = true;
    lightboxRef.current?.loadAndOpen(index, undefined, initialPoint ?? null);
  }, []);

  const openCurrentLightbox = useCallback(() => {
    openGallery(getCurrentIndex(), null);
  }, [openGallery, getCurrentIndex]);

  useEffect(() => {
    lightboxOpen?.register(openCurrentLightbox);
    return () => lightboxOpen?.register(null);
  }, [lightboxOpen, openCurrentLightbox]);

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
      className="relative flex w-full text-center"
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

      <figure
        data-photo-fit-frame=""
        className="relative mx-auto w-full max-w-full"
        style={{ ['--photo-aspect' as string]: String(width / height) }}
      >
        <div
          ref={imageFrameRef}
          data-photo-page-image=""
          data-photo-page-src={url}
          className="relative mx-auto block w-full max-w-full"
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
            className={isInAlbum
              ? 'w-full [--photo-max-h:calc(100vh-162px)] sm:[--photo-max-h:calc(100vh-180px)] md:[--photo-max-h:calc(100vh-172px)] lg:[--photo-max-h:calc(100vh-218px)]'
              : 'w-full [--photo-max-h:calc(100vh-98px)] sm:[--photo-max-h:calc(100vh-114px)] md:[--photo-max-h:calc(100vh-106px)] lg:[--photo-max-h:calc(100vh-138px)]'}
            style={{
              aspectRatio: `${width}/${height}`,
            }}
          />
        </div>
        {photoId ? (
          <PhotoMemberTagLayer
            photoId={photoId}
            initialMemberTags={memberTags}
          />
        ) : null}
      </figure>
    </div>
  );
}
