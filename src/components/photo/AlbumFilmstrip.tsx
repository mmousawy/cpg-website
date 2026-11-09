'use client';

import { useCollectionPhotoNavigation } from '@/components/photo/useCollectionPhotoNavigation';
import BlurImage from '@/components/shared/BlurImage';
import HoverPrefetchLink from '@/components/shared/HoverPrefetchLink';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Tooltip from '@/components/shared/Tooltip';
import { prefersReducedMotion } from '@/utils/reduceMotion';
import { isPhotoSwipeOpen } from '@/utils/photoswipe';
import { getSquareThumbnailUrl } from '@/utils/supabaseImageLoader';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import ArrowLeftFillSVG from 'public/icons/arrow-left-fill.svg';
import ArrowRightFillSVG from 'public/icons/arrow-right-fill.svg';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Swiper as SwiperType } from 'swiper';
import { A11y, FreeMode } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';

interface SiblingPhoto {
  shortId: string;
  url: string;
  blurhash: string | null;
  title?: string | null;
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
  // 1px slack so subpixel layout does not count a fully on-screen thumb as clipped.
  return elementRect.left >= containerRect.left - 1 && elementRect.right <= containerRect.right + 1;
}

function filmstripSpeed(): number {
  return prefersReducedMotion() ? 0 : 300;
}

function filmstripPhotoTitle(title: string | null | undefined): string | null {
  const trimmed = title?.trim();
  return trimmed ? trimmed : null;
}

function scrollFilmstripToIndex(
  swiper: SwiperType,
  index: number,
  photoCount: number,
  viewport: HTMLElement,
) {
  if (index < 0) return;

  const slideEl = swiper.slides[index];
  if (!(slideEl instanceof HTMLElement)) return;
  if (isThumbnailVisible(viewport, slideEl)) return;

  const speed = filmstripSpeed();
  let nextTranslate: number;
  if (index === 0) {
    nextTranslate = swiper.minTranslate();
  } else if (index === photoCount - 1) {
    nextTranslate = swiper.maxTranslate();
  } else {
    const containerRect = viewport.getBoundingClientRect();
    const slideRect = slideEl.getBoundingClientRect();
    const delta = (slideRect.left - containerRect.left)
      - (containerRect.width / 2)
      + (slideRect.width / 2);
    nextTranslate = swiper.getTranslate() - delta;
  }

  const clamped = Math.min(swiper.minTranslate(), Math.max(swiper.maxTranslate(), nextTranslate));
  if (Math.abs(clamped - swiper.getTranslate()) < 1) return;
  swiper.setTransition(speed);
  swiper.setTranslate(clamped);
  swiper.updateProgress();
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
  const {
    hasPrev,
    hasNext,
    pendingShortId,
    setPendingShortId,
    goToPrevPhoto,
    goToNextPhoto,
  } = useCollectionPhotoNavigation({
    photos,
    currentPhotoShortId,
    getPhotoHref,
  });
  const swiperRef = useRef<SwiperType | null>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const suppressThumbClickRef = useRef(false);
  const draggingRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const shouldIgnoreThumbClick = useCallback(() => (
    suppressThumbClickRef.current || Boolean(swiperRef.current?.animating)
  ), []);

  const ignoreThumbClick = useCallback((event: { preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault();
    event.stopPropagation();
    suppressThumbClickRef.current = false;
  }, []);

  const syncEdges = useCallback((swiper: SwiperType) => {
    setCanScrollLeft(!swiper.isBeginning);
    setCanScrollRight(!swiper.isEnd);
  }, []);

  const selectedShortId =
    pendingShortId && pendingShortId !== currentPhotoShortId
      ? pendingShortId
      : currentPhotoShortId;
  const selectedIndex = photos.findIndex((photo) => photo.shortId === selectedShortId);

  const ensureSelectedThumbVisible = useCallback(() => {
    if (draggingRef.current) return;
    const swiper = swiperRef.current;
    const viewport = clipRef.current;
    if (!swiper || !viewport) return;
    scrollFilmstripToIndex(swiper, selectedIndex, photos.length, viewport);
  }, [photos.length, selectedIndex]);

  useEffect(() => {
    ensureSelectedThumbVisible();
  }, [ensureSelectedThumbVisible]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // PhotoSwipe handles arrows on `document` and does not stopPropagation.
      // Skip page navigation until the lightbox is closed.
      if (e.defaultPrevented || isPhotoSwipeOpen()) {
        return;
      }

      if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        goToPrevPhoto();
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        goToNextPhoto();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPhoto, goToPrevPhoto, hasNext, hasPrev]);

  const handlePrevClick = (e: React.MouseEvent) => {
    e.preventDefault();
    goToPrevPhoto();
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    goToNextPhoto();
  };

  if (photos.length <= 1) {
    return null;
  }

  return (
    <div
      className={clsx(
        'w-full flex justify-center pb-0 pt-2 md:py-2',
        'md:max-w-[calc(100vw-432px)] lg:max-w-[calc(100vw-608px)]',
      )}
    >
      <div
        className="relative flex items-center gap-1 w-fit max-w-full min-w-0"
      >
        <button
          type="button"
          onClick={handlePrevClick}
          disabled={!hasPrev}
          className={clsx(
            'relative z-20 shrink-0 flex items-center justify-center size-8 rounded-full border transition-colors',
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
          className="relative flex-1 min-w-0"
        >
          <div
            aria-hidden
            className={clsx(
              'pointer-events-none absolute -left-5 top-0 bottom-0 z-10 w-12 bg-linear-to-r from-background via-background to-transparent transition-opacity duration-200',
              canScrollLeft ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            aria-hidden
            className={clsx(
              'pointer-events-none absolute -right-5 top-0 bottom-0 z-10 w-12 bg-linear-to-l from-background via-background to-transparent transition-opacity duration-200',
              canScrollRight ? 'opacity-100' : 'opacity-0',
            )}
          />

          <div
            ref={clipRef}
            className="overflow-clip overscroll-none px-2 py-2"
            onClickCapture={(event) => {
              if (shouldIgnoreThumbClick()) {
                ignoreThumbClick(event);
                event.nativeEvent.stopImmediatePropagation();
              }
            }}
          >
            <Swiper
              modules={[A11y, FreeMode]}
              slidesPerView="auto"
              spaceBetween={0}
              touchEventsTarget="container"
              freeMode={{
                enabled: true,
                momentum: !prefersReducedMotion(),
                momentumRatio: 0.45,
                momentumVelocityRatio: 0.5,
                momentumBounce: !prefersReducedMotion(),
                momentumBounceRatio: 1,
              }}
              grabCursor
              watchOverflow
              resistance
              resistanceRatio={0.85}
              preventClicks
              preventClicksPropagation
              threshold={0}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                syncEdges(swiper);
                ensureSelectedThumbVisible();
              }}
              onTouchStart={(swiper) => {
                draggingRef.current = true;
                suppressThumbClickRef.current = false;
                swiper.setTransition(0);
              }}
              onTouchEnd={(swiper) => {
                draggingRef.current = false;
                syncEdges(swiper);
              }}
              onSliderMove={() => {
                suppressThumbClickRef.current = true;
              }}
              onTransitionEnd={syncEdges}
              onResize={syncEdges}
              className="overflow-visible! cursor-grab select-none [&_.swiper-wrapper]:cursor-grab [&_.swiper-wrapper]:h-auto [&_a]:cursor-grab [&_a]:[user-drag:none]"
            >
              {photos.map((photo, index) => {
                const isSelected = photo.shortId === selectedShortId;
                const isPending = photo.shortId === pendingShortId && pendingShortId !== currentPhotoShortId;
                const thumbnailUrl = getSquareThumbnailUrl(photo.url, 48, 75) || photo.url;
                const title = filmstripPhotoTitle(photo.title);
                const thumbnail = (
                  <HoverPrefetchLink
                    href={getPhotoHref(photo.shortId)}
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                    onClick={(event) => {
                      if (shouldIgnoreThumbClick()) {
                        ignoreThumbClick(event);
                        return;
                      }
                      if (photo.shortId === currentPhotoShortId || photo.shortId === pendingShortId) {
                        event.preventDefault();
                        return;
                      }
                      setPendingShortId(photo.shortId);
                    }}
                    className="group relative block size-12"
                    aria-current={isSelected && !isPending ? 'page' : undefined}
                    aria-label={`Go to photo ${index + 1} of ${photos.length}${isSelected && !isPending ? ' (current)' : ''}${isPending ? ' (loading)' : ''}`}
                    aria-busy={isPending}
                  >
                    <span
                      className="pointer-events-none absolute inset-0 origin-center transition-transform duration-150 ease-out group-active:scale-95"
                    >
                      <span
                        className={clsx(
                          'absolute inset-0 overflow-hidden rounded-sm',
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-primary dark:ring-offset-white/70'
                            : 'border-border-color group-hover:border-primary/50',
                        )}
                      >
                        <BlurImage
                          src={thumbnailUrl}
                          alt={title || `Photo ${index + 1}`}
                          blurhash={photo.blurhash}
                          fill
                          sizes="48px"
                          loading="lazy"
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
                      </span>
                    </span>
                  </HoverPrefetchLink>
                );

                return (
                  <SwiperSlide
                    key={photo.shortId}
                    className="h-auto! w-auto! pr-2 last:pr-0"
                  >
                    {title ? (
                      <Tooltip
                        content={title}
                        position="top"
                      >
                        {thumbnail}
                      </Tooltip>
                    ) : thumbnail}
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNextClick}
          disabled={!hasNext}
          className={clsx(
            'relative z-20 shrink-0 flex items-center justify-center size-8 rounded-full border transition-colors',
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
    </div>
  );
}
