'use client';

import BlurImage from '@/components/shared/BlurImage';
import { useProgressRouter } from '@/components/layout/NavigationProgress';
import { getSquareThumbnailUrl } from '@/utils/supabaseImageLoader';
import clsx from 'clsx';
import Link from 'next/link';
import ArrowLeftFillSVG from 'public/icons/arrow-left-fill.svg';
import ArrowRightFillSVG from 'public/icons/arrow-right-fill.svg';
import { useEffect, useRef } from 'react';

interface SiblingPhoto {
  shortId: string;
  url: string;
  blurhash: string | null;
  sortOrder: number;
}

interface AlbumFilmstripProps {
  photos: SiblingPhoto[];
  currentPhotoShortId: string;
  nickname: string;
  albumSlug: string;
}

export default function AlbumFilmstrip({
  photos,
  currentPhotoShortId,
  nickname,
  albumSlug,
}: AlbumFilmstripProps) {
  const router = useProgressRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeThumbnailRef = useRef<HTMLAnchorElement>(null);
  const hasScrolledRef = useRef(false);

  // Find current photo index
  const currentIndex = photos.findIndex((p) => p.shortId === currentPhotoShortId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  // Scroll to show active thumbnail on mount/navigation (no animation)
  useEffect(() => {
    if (!activeThumbnailRef.current || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const activeElement = activeThumbnailRef.current;

    // Reset scroll flag when photo changes
    hasScrolledRef.current = false;

    // Handle edge cases: first photo scrolls to start, last photo scrolls to end
    if (currentIndex === 0) {
      // First photo - scroll to start
      container.scrollLeft = 0;
    } else if (currentIndex === photos.length - 1) {
      // Last photo - scroll to end
      container.scrollLeft = container.scrollWidth - container.clientWidth;
    } else {
      // Middle photos - center the active thumbnail
      const containerRect = container.getBoundingClientRect();
      const elementRect = activeElement.getBoundingClientRect();
      const scrollLeft = container.scrollLeft + (elementRect.left - containerRect.left) - (containerRect.width / 2) + (elementRect.width / 2);
      container.scrollLeft = scrollLeft;
    }

    hasScrolledRef.current = true;
  }, [currentIndex, photos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        const prevPhoto = photos[currentIndex - 1];
        router.push(`/@${nickname}/album/${albumSlug}/photo/${prevPhoto.shortId}`);
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        const nextPhoto = photos[currentIndex + 1];
        router.push(`/@${nickname}/album/${albumSlug}/photo/${nextPhoto.shortId}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, hasPrev, hasNext, photos, nickname, albumSlug, router]);

  const handlePrevClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasPrev) {
      const prevPhoto = photos[currentIndex - 1];
      router.push(`/@${nickname}/album/${albumSlug}/photo/${prevPhoto.shortId}`);
    }
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasNext) {
      const nextPhoto = photos[currentIndex + 1];
      router.push(`/@${nickname}/album/${albumSlug}/photo/${nextPhoto.shortId}`);
    }
  };

  if (photos.length <= 1) {
    return null; // Don't show filmstrip if only one photo
  }

  return (
    <div
      className={clsx('flex items-center gap-2 pb-0 pt-2 md:py-2 w-full',
        'md:max-w-[calc(100vw-432px)] lg:max-w-[calc(100vw-480px)]',
      )}
    >
      {/* Prev button - always visible, disabled when no prev */}
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

      {/* Scrollable thumbnail strip */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto gap-2 py-2 px-1 flex-1 min-w-0"
      >
        {photos.map((photo, index) => {
          const isActive = photo.shortId === currentPhotoShortId;
          const thumbnailUrl = getSquareThumbnailUrl(photo.url, 48, 75) || photo.url;
          const isFirstPhoto = index === 0;
          const isLastPhoto = index === photos.length - 1;

          return (
            <Link
              key={photo.shortId}
              ref={isActive ? activeThumbnailRef : null}
              href={`/@${nickname}/album/${albumSlug}/photo/${photo.shortId}`}
              className={clsx(
                'relative shrink-0 size-12 rounded-sm overflow-hidden transition-all',
                isActive
                  ? 'ring-2 ring-offset-2 ring-primary dark:ring-offset-white/70'
                  : 'border-border-color hover:border-primary/50',
                isFirstPhoto && 'ml-auto',
                isLastPhoto && 'mr-auto',
              )}
              aria-label={`Go to photo ${index + 1} of ${photos.length}${isActive ? ' (current)' : ''}`}
            >
              <BlurImage
                src={thumbnailUrl}
                alt={`Photo ${index + 1}`}
                blurhash={photo.blurhash}
                fill
                sizes="48px"
                loading="lazy"
                className="object-cover"
              />
            </Link>
          );
        })}
      </div>

      {/* Next button - always visible, disabled when no next */}
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
