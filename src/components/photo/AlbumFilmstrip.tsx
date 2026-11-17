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
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
  /** Pending thumb whose full-size image has already loaded. */
  loadedShortId?: string | null;
}

function getPhotoShortIdFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const photoIndex = segments.lastIndexOf('photo');
  if (photoIndex === -1 || photoIndex >= segments.length - 1) return '';
  return decodeURIComponent(segments[photoIndex + 1]);
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
  speed = filmstripSpeed(),
) {
  if (index < 0) return false;

  swiper.update();
  const slideEl = swiper.slides[index];
  if (!(slideEl instanceof HTMLElement) || slideEl.offsetWidth < 1) return false;

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
  swiper.setTransition(speed);
  swiper.setTranslate(clamped);
  swiper.updateProgress();
  return true;
}

/** How close to the clip edge counts as "on the edge" (px). */
const FILMSTRIP_EDGE_PX = 8;
/** Nudge an edge thumb this far inside the clip — about one thumb, not the center. */
const FILMSTRIP_NUDGE_PX = 56;

function nudgeFilmstripThumb(
  swiper: SwiperType,
  index: number,
  viewport: HTMLElement,
) {
  if (index < 0) return;
  const slideEl = swiper.slides[index];
  if (!(slideEl instanceof HTMLElement)) return;

  const clip = viewport.getBoundingClientRect();
  const slide = slideEl.getBoundingClientRect();
  let shift = 0;
  if (slide.left < clip.left + FILMSTRIP_EDGE_PX) {
    shift = (clip.left + FILMSTRIP_NUDGE_PX) - slide.left;
  } else if (slide.right > clip.right - FILMSTRIP_EDGE_PX) {
    shift = (clip.right - FILMSTRIP_NUDGE_PX) - slide.right;
  } else {
    return;
  }

  const nextTranslate = swiper.getTranslate() + shift;
  const clamped = Math.min(swiper.minTranslate(), Math.max(swiper.maxTranslate(), nextTranslate));
  if (Math.abs(clamped - swiper.getTranslate()) < 1) return;
  swiper.setTransition(filmstripSpeed());
  swiper.setTranslate(clamped);
  swiper.updateProgress();
}

export default function AlbumFilmstrip({
  photos,
  currentPhotoShortId: currentPhotoShortIdProp,
  nickname,
  albumSlug,
  basePath,
  loadedShortId,
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
  // Every photo is a slot. Blurhashes fill in batches around the selection
  // and wherever a drag or snap has moved the strip.
  const BLURHASH_BATCH = 10;
  const anchor = selectedIndex < 0 ? 0 : selectedIndex;
  const [loadedFrom, setLoadedFrom] = useState(() => Math.max(0, anchor - BLURHASH_BATCH));
  const [loadedThrough, setLoadedThrough] = useState(() => Math.min(photos.length - 1, anchor + BLURHASH_BATCH));
  const thumbsReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const landedRef = useRef(false);
  const userMovedRef = useRef(false);
  const centeredTranslateRef = useRef<number | null>(null);

  const extendLoadedRange = useCallback((swiper: SwiperType) => {
    const viewport = clipRef.current;
    if (!viewport) return;
    const slides = swiper.slides;
    if (!slides?.length) return;
    const clip = viewport.getBoundingClientRect();
    let first = -1;
    let last = -1;
    Array.from(slides).forEach((slide, index) => {
      if (!(slide instanceof HTMLElement)) return;
      const rect = slide.getBoundingClientRect();
      if (rect.right < clip.left || rect.left > clip.right) return;
      if (first < 0) first = index;
      last = index;
    });
    if (first < 0) return;
    const from = Math.max(0, first - BLURHASH_BATCH);
    const through = Math.min(photos.length - 1, last + BLURHASH_BATCH);
    setLoadedFrom((current) => Math.min(current, from));
    setLoadedThrough((current) => Math.max(current, through));
  }, [photos.length]);

  if (selectedIndex >= 0) {
    const nextFrom = Math.max(0, selectedIndex - BLURHASH_BATCH);
    const nextThrough = Math.min(photos.length - 1, selectedIndex + BLURHASH_BATCH);
    if (loadedFrom > nextFrom) setLoadedFrom(nextFrom);
    if (loadedThrough < nextThrough) setLoadedThrough(nextThrough);
  }

  const ensureSelectedThumbVisible = useCallback(() => {
    if (draggingRef.current) return;
    const swiper = swiperRef.current;
    const viewport = clipRef.current;
    if (!swiper || !viewport) return;
    if (!landedRef.current) {
      const placed = scrollFilmstripToIndex(swiper, selectedIndex, photos.length, viewport, 0);
      if (!placed) return;
      landedRef.current = true;
      centeredTranslateRef.current = swiper.getTranslate();
    } else if (!userMovedRef.current && centeredTranslateRef.current != null) {
      swiper.setTransition(0);
      swiper.setTranslate(centeredTranslateRef.current);
    } else {
      nudgeFilmstripThumb(swiper, selectedIndex, viewport);
    }
    requestAnimationFrame(() => extendLoadedRange(swiper));
  }, [extendLoadedRange, photos.length, selectedIndex]);

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
                const place = () => {
                  ensureSelectedThumbVisible();
                  if (swiper.slides?.length) {
                    swiper.updateProgress();
                    syncEdges(swiper);
                  }
                  extendLoadedRange(swiper);
                };
                requestAnimationFrame(() => {
                  place();
                  requestAnimationFrame(place);
                });
              }}
              onTouchStart={(swiper) => {
                draggingRef.current = true;
                userMovedRef.current = true;
                suppressThumbClickRef.current = false;
                swiper.setTransition(0);
              }}
              onTouchEnd={(swiper) => {
                draggingRef.current = false;
                syncEdges(swiper);
                extendLoadedRange(swiper);
              }}
              onSliderMove={() => {
                suppressThumbClickRef.current = true;
              }}
              onTransitionEnd={(swiper) => {
                syncEdges(swiper);
                extendLoadedRange(swiper);
              }}
              onResize={syncEdges}
              onUpdate={(swiper) => {
                if (userMovedRef.current || centeredTranslateRef.current == null) return;
                if (Math.abs(swiper.getTranslate() - centeredTranslateRef.current) < 1) return;
                swiper.setTransition(0);
                swiper.setTranslate(centeredTranslateRef.current);
              }}
              className="overflow-visible! cursor-grab select-none [&_.swiper-wrapper]:cursor-grab [&_.swiper-wrapper]:h-auto [&_a]:cursor-grab [&_a]:[user-drag:none]"
            >
              {photos.map((photo, index) => {
                const isSelected = photo.shortId === selectedShortId;
                const isPending = photo.shortId === pendingShortId
                  && pendingShortId !== currentPhotoShortId
                  && loadedShortId !== photo.shortId;
                const showBlurhash = thumbsReady && index >= loadedFrom && index <= loadedThrough;
                const thumbnailUrl = showBlurhash
                  ? (getSquareThumbnailUrl(photo.url, 48, 75) || photo.url)
                  : null;
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
                    className="group relative block size-12 select-none"
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
                        {showBlurhash ? (
                          <BlurImage
                            src={thumbnailUrl || photo.url}
                            alt={title || `Photo ${index + 1}`}
                            blurhash={photo.blurhash}
                            fill
                            sizes="48px"
                            loading="lazy"
                            fetchPriority="low"
                            className="object-cover"
                          />
                        ) : (
                          <span
                            className="absolute inset-0 bg-neutral-200 dark:bg-neutral-800"
                            aria-hidden
                          />
                        )}
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
