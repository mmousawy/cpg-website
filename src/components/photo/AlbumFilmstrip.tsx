'use client';

import BlurImage from '@/components/shared/BlurImage';
import { useProgressRouter } from '@/components/layout/NavigationProgress';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { getSquareThumbnailUrl } from '@/utils/supabaseImageLoader';
import clsx from 'clsx';
import HoverPrefetchLink from '@/components/shared/HoverPrefetchLink';
import ArrowLeftFillSVG from 'public/icons/arrow-left-fill.svg';
import ArrowRightFillSVG from 'public/icons/arrow-right-fill.svg';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

interface SiblingPhoto {
  shortId: string;
  url: string;
  blurhash: string | null;
  sortOrder: number;
}

interface AlbumFilmstripProps {
  photos: SiblingPhoto[];
  /** Optional — derived from pathname when omitted */
  currentPhotoShortId?: string;
  /** Album context: owner nickname */
  nickname?: string;
  /** Album context: album slug */
  albumSlug?: string;
  /** Alternative: base path for non-album context (e.g. /challenges/my-challenge) */
  basePath?: string;
}

function getPhotoShortIdFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const photoIndex = segments.lastIndexOf('photo');
  if (photoIndex === -1 || photoIndex >= segments.length - 1) return '';
  return decodeURIComponent(segments[photoIndex + 1]);
}

function isThumbnailVisible(container: HTMLElement, element: HTMLElement): boolean {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  return elementRect.left >= containerRect.left && elementRect.right <= containerRect.right;
}

export default function AlbumFilmstrip({
  photos,
  currentPhotoShortId: currentPhotoShortIdProp,
  nickname,
  albumSlug,
  basePath,
}: AlbumFilmstripProps) {
  const pathname = usePathname();
  const pathShortId = getPhotoShortIdFromPathname(pathname);
  const currentPhotoShortId = pathShortId || currentPhotoShortIdProp || '';

  const getPhotoHref = useCallback((shortId: string) => basePath
    ? `${basePath}/photo/${shortId}`
    : `/@${nickname}/album/${albumSlug}/photo/${shortId}`,
  [basePath, nickname, albumSlug]);
  const router = useProgressRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeThumbnailRef = useRef<HTMLAnchorElement>(null);
  const [pendingShortId, setPendingShortId] = useState<string | null>(null);

  const currentIndex = photos.findIndex((p) => p.shortId === currentPhotoShortId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;
  const selectedShortId =
    pendingShortId && pendingShortId !== currentPhotoShortId
      ? pendingShortId
      : currentPhotoShortId;

  const navigateToPhoto = useCallback((shortId: string) => {
    if (shortId === currentPhotoShortId || shortId === pendingShortId) return;
    setPendingShortId(shortId);
    router.push(getPhotoHref(shortId));
  }, [currentPhotoShortId, pendingShortId, getPhotoHref, router]);

  useEffect(() => {
    if (!pendingShortId) return;
    if (pendingShortId === pathShortId || pendingShortId === currentPhotoShortIdProp) {
      setPendingShortId(null);
    }
  }, [pendingShortId, pathShortId, currentPhotoShortIdProp]);

  // Scroll active thumbnail into view only when it is outside the visible strip
  useEffect(() => {
    if (!activeThumbnailRef.current || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const activeElement = activeThumbnailRef.current;

    if (isThumbnailVisible(container, activeElement)) {
      return;
    }

    if (currentIndex === 0) {
      container.scrollLeft = 0;
    } else if (currentIndex === photos.length - 1) {
      container.scrollLeft = container.scrollWidth - container.clientWidth;
    } else {
      const containerRect = container.getBoundingClientRect();
      const elementRect = activeElement.getBoundingClientRect();
      const scrollLeft = container.scrollLeft + (elementRect.left - containerRect.left) - (containerRect.width / 2) + (elementRect.width / 2);
      container.scrollLeft = scrollLeft;
    }
  }, [currentIndex, photos.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        navigateToPhoto(photos[currentIndex - 1].shortId);
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        navigateToPhoto(photos[currentIndex + 1].shortId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, hasPrev, hasNext, photos, navigateToPhoto]);

  const handlePrevClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasPrev) {
      navigateToPhoto(photos[currentIndex - 1].shortId);
    }
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasNext) {
      navigateToPhoto(photos[currentIndex + 1].shortId);
    }
  };

  if (photos.length <= 1) {
    return null;
  }

  return (
    <div
      className={clsx('flex items-center gap-2 pb-0 pt-2 md:py-2 w-full',
        'md:max-w-[calc(100vw-432px)] lg:max-w-[calc(100vw-608px)]',
      )}
    >
      <button
        type="button"
        onClick={handlePrevClick}
        disabled={!hasPrev}
        className={clsx(
          'shrink-0 flex items-center justify-center size-8 rounded-full border transition-colors',
          hasPrev
            ? 'border-border-color bg-background hover:border-primary hover:bg-primary/5 cursor-pointer'
            : 'border-border-color bg-background opacity-40 cursor-not-allowed',
        )}
        aria-label="Previous photo"
        aria-disabled={!hasPrev}
      >
        <ArrowLeftFillSVG
          className="size-4"
        />
      </button>

      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto gap-2 py-2 px-1 flex-1 min-w-0"
      >
        {photos.map((photo, index) => {
          const isSelected = photo.shortId === selectedShortId;
          const isPending = photo.shortId === pendingShortId && pendingShortId !== currentPhotoShortId;
          const thumbnailUrl = getSquareThumbnailUrl(photo.url, 48, 75) || photo.url;
          const isFirstPhoto = index === 0;
          const isLastPhoto = index === photos.length - 1;

          return (
            <HoverPrefetchLink
              key={photo.shortId}
              ref={isSelected ? activeThumbnailRef : null}
              href={getPhotoHref(photo.shortId)}
              onClick={(event) => {
                if (photo.shortId === currentPhotoShortId || photo.shortId === pendingShortId) {
                  event.preventDefault();
                  return;
                }
                setPendingShortId(photo.shortId);
              }}
              className={clsx(
                'relative shrink-0 size-12 rounded-sm overflow-hidden transition-all duration-150 ease-out active:scale-95',
                isSelected
                  ? 'ring-2 ring-offset-2 ring-primary dark:ring-offset-white/70'
                  : 'border-border-color hover:border-primary/50',
                isFirstPhoto && 'ml-auto',
                isLastPhoto && 'mr-auto',
              )}
              aria-current={isSelected && !isPending ? 'page' : undefined}
              aria-label={`Go to photo ${index + 1} of ${photos.length}${isSelected && !isPending ? ' (current)' : ''}${isPending ? ' (loading)' : ''}`}
              aria-busy={isPending}
            >
              <BlurImage
                src={thumbnailUrl}
                alt={`Photo ${index + 1}`}
                blurhash={photo.blurhash}
                fill
                sizes="48px"
                loading="eager"
                fetchPriority="low"
                className="object-cover"
              />
              {isPending && (
                <span
                  className="absolute inset-0 z-10 flex items-center justify-center bg-black/45"
                >
                  <LoadingSpinner
                    size="sm"
                    className="size-4! border-white/90 border-t-transparent"
                  />
                </span>
              )}
            </HoverPrefetchLink>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleNextClick}
        disabled={!hasNext}
        className={clsx(
          'shrink-0 flex items-center justify-center size-8 rounded-full border transition-colors',
          hasNext
            ? 'border-border-color bg-background hover:border-primary hover:bg-primary/5 cursor-pointer'
            : 'border-border-color bg-background opacity-40 cursor-not-allowed',
        )}
        aria-label="Next photo"
        aria-disabled={!hasNext}
      >
        <ArrowRightFillSVG
          className="size-4"
        />
      </button>
    </div>
  );
}
