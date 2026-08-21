'use client';

import AlbumFilmstrip from '@/components/photo/AlbumFilmstrip';
import {
  PhotoNavigationProvider,
  usePhotoNavigation,
} from '@/components/photo/PhotoNavigationContext';
import type { SiblingPhoto } from '@/components/photo/PhotoPageContent';
import BlurImage, { getBlurImageCacheKey, isBlurImageCached } from '@/components/shared/BlurImage';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

type PhotoFilmstripShellProps = {
  siblingPhotos: SiblingPhoto[];
  nickname?: string;
  albumSlug?: string;
  basePath?: string;
  sidebar: ReactNode;
  children: ReactNode;
};

function getPhotoShortIdFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const photoIndex = segments.lastIndexOf('photo');
  if (photoIndex === -1 || photoIndex >= segments.length - 1) return '';
  return decodeURIComponent(segments[photoIndex + 1]);
}

function getPhotoCacheKey(photo: SiblingPhoto): string {
  return getBlurImageCacheKey(photo.url, {
    width: photo.width,
    unoptimized: true,
  });
}

function PhotoFilmstripShellInner({
  siblingPhotos,
  nickname,
  albumSlug,
  basePath,
  sidebar,
  children,
}: PhotoFilmstripShellProps) {
  const pathname = usePathname();
  const currentPhotoShortId = getPhotoShortIdFromPathname(pathname);
  const { pendingShortId, setPendingShortId } = usePhotoNavigation();
  const [contentMountKey, setContentMountKey] = useState(0);
  const showFilmstrip = siblingPhotos.length > 1;

  const overlayPhoto = pendingShortId
    ? siblingPhotos.find((photo) => photo.shortId === pendingShortId)
    : null;

  // Keep the overlay until the target photo is in the SPA image cache, then remount
  // children so PhotoWithLightbox's BlurImage starts in the visible (no-fade) state.
  useEffect(() => {
    if (!pendingShortId || pendingShortId !== currentPhotoShortId) return;

    const photo = siblingPhotos.find((p) => p.shortId === pendingShortId);
    if (!photo) {
      setPendingShortId(null);
      return;
    }

    const cacheKey = getPhotoCacheKey(photo);

    const finishTransition = () => {
      setPendingShortId(null);
      setContentMountKey((key) => key + 1);
    };

    if (isBlurImageCached(cacheKey)) {
      finishTransition();
      return;
    }

    let frameId = 0;
    const poll = () => {
      if (isBlurImageCached(cacheKey)) {
        finishTransition();
        return;
      }
      frameId = requestAnimationFrame(poll);
    };
    frameId = requestAnimationFrame(poll);

    const fallback = setTimeout(finishTransition, 3000);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(fallback);
    };
  }, [pendingShortId, currentPhotoShortId, siblingPhotos, setPendingShortId]);

  return (
    <div
      className="w-full px-4 pt-4 md:p-4 md:flex md:gap-4 md:items-stretch lg:p-8 lg:gap-8"
    >
      <div
        className="md:flex-1 md:sticky md:self-start md:top-[90px] md:h-[calc(100vh-106px)] lg:top-[106px] lg:h-[calc(100vh-138px)] md:flex md:flex-col"
      >
        <div
          className="relative flex-1 flex items-center justify-center"
        >
          <div
            key={contentMountKey}
            className="flex w-full items-center justify-center"
          >
            {children}
          </div>
          {overlayPhoto && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-background"
            >
              <BlurImage
                src={overlayPhoto.url}
                blurhash={overlayPhoto.blurhash}
                width={overlayPhoto.width}
                height={overlayPhoto.height}
                alt=""
                contain
                unoptimized
                className="max-h-[calc(100vh-154px)] sm:max-h-[calc(100vh-172px)] lg:max-h-[calc(100vh-218px)]"
                style={{
                  aspectRatio: `${overlayPhoto.width}/${overlayPhoto.height}`,
                }}
              />
            </div>
          )}
        </div>
        {showFilmstrip && (
          <div
            className="lg:translate-y-4"
          >
            <AlbumFilmstrip
              photos={siblingPhotos}
              currentPhotoShortId={currentPhotoShortId}
              {...(nickname && albumSlug
                ? { nickname, albumSlug }
                : { basePath })}
            />
          </div>
        )}
      </div>

      {sidebar}
    </div>
  );
}

/**
 * Persists album/event/challenge filmstrip across /photo/[photoId] navigations.
 * `children` is the lightbox slot; `sidebar` is the @sidebar parallel route.
 */
export default function PhotoFilmstripShell(props: PhotoFilmstripShellProps) {
  return (
    <PhotoNavigationProvider>
      <PhotoFilmstripShellInner {...props} />
    </PhotoNavigationProvider>
  );
}
