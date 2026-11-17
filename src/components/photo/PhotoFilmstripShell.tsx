'use client';

import AlbumFilmstrip from '@/components/photo/AlbumFilmstrip';
import { PhotoLightboxOpenProvider } from '@/context/PhotoLightboxOpenContext';
import PhotoPageFixedStageChrome from '@/components/photo/PhotoPageFixedStageChrome';
import { PhotoStageChromeSlotProvider } from '@/context/PhotoStageChromeSlotContext';
import {
  PhotoNavigationProvider,
  usePhotoNavigation,
} from '@/components/photo/PhotoNavigationContext';
import type { SiblingPhoto } from '@/components/photo/PhotoPageContent';
import { useCollectionPhotoNavigation } from '@/components/photo/useCollectionPhotoNavigation';
import { useHasHover } from '@/hooks/useHasHover';
import { useHorizontalSwipe } from '@/hooks/useHorizontalSwipe';
import clsx from 'clsx';
import { getContainedPhotoSize, measureAlbumPhotoMaxHeightPx } from '@/utils/photoContainSize';
import { getPhotoCollectionFallbackHref } from '@/utils/photoOverviewNavigation';
import BlurImage from '@/components/shared/BlurImage';
import { preloadPhoto } from '@/utils/preloadPhoto';
import { prefersReducedMotion } from '@/utils/reduceMotion';
import { PhotoStageIdleRevealProvider } from '@/context/PhotoStageIdleRevealContext';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

type PhotoFilmstripShellProps = {
  siblingPhotos: SiblingPhoto[];
  nickname?: string;
  albumSlug?: string;
  basePath?: string;
  fallbackLabel?: string;
  sidebar: ReactNode;
  children: ReactNode;
};

function getPhotoShortIdFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const photoIndex = segments.lastIndexOf('photo');
  if (photoIndex === -1 || photoIndex >= segments.length - 1) return '';
  return decodeURIComponent(segments[photoIndex + 1]);
}

function readTranslateX(element: HTMLElement | null): number {
  if (!element) return 0;
  const value = getComputedStyle(element).transform;
  if (!value || value === 'none') return 0;
  try {
    return new DOMMatrix(value).m41;
  } catch {
    return 0;
  }
}

const SWIPE_SNAP_MS = 250;

const PHOTO_COVER_CLASS = 'h-full w-full [--photo-max-h:calc(100vh-162px)] sm:[--photo-max-h:calc(100vh-180px)] md:[--photo-max-h:calc(100vh-172px)] lg:[--photo-max-h:calc(100vh-218px)]';

function PhotoSwipeCover({ photo }: { photo: SiblingPhoto }) {
  return (
    <BlurImage
      src={photo.url}
      blurhash={photo.blurhash}
      width={photo.width}
      height={photo.height}
      alt=""
      contain
      unoptimized
      className={PHOTO_COVER_CLASS}
    />
  );
}

const SWIPE_RUBBER_BAND = 0.32;
/** Background visible between the current photo and the one sliding in. */
const SWIPE_GAP_PX = 16;

function PhotoFilmstripShellInner({
  siblingPhotos,
  nickname,
  albumSlug,
  basePath,
  fallbackLabel = 'gallery',
  sidebar,
  children,
}: PhotoFilmstripShellProps) {
  const pathname = usePathname();
  const currentPhotoShortId = getPhotoShortIdFromPathname(pathname);
  const { pendingShortId, setPendingShortId } = usePhotoNavigation();
  const showFilmstrip = siblingPhotos.length > 1;
  const [peekShortId, setPeekShortId] = useState<string | null>(null);
  const [peekOrigin, setPeekOrigin] = useState<'left' | 'right'>('right');
  // Bumped when a committed swipe snap finishes so the height animation can
  // start on a full-frame photo instead of shrinking a mid-slide peek.
  const [swipeRestTick, setSwipeRestTick] = useState(0);

  const getPhotoHref = useCallback((shortId: string) => (
    nickname && albumSlug
      ? `/@${nickname}/album/${albumSlug}/photo/${shortId}`
      : `${basePath}/photo/${shortId}`
  ), [nickname, albumSlug, basePath]);

  const {
    currentIndex,
    prevIndex,
    nextIndex,
    hasPrev,
    hasNext,
    getNeighbor,
    getHeadingShortId,
    goToPrevPhoto,
    goToNextPhoto,
  } = useCollectionPhotoNavigation({
    photos: siblingPhotos,
    currentPhotoShortId,
    getPhotoHref,
  });

  // Smoothly resize the photo container between photos on mobile so navigation
  // doesn't snap the layout. Desktop uses a fixed-height column, so it's skipped.
  // Target height comes from the photo's metadata (the same contain math as the
  // image), never from the decoded image box — that box is still the previous
  // height, or empty, until the file loads, and measuring it restarts the
  // animation. The image is fitted inside the frame, so it stays fully visible
  // while the height eases. rAF-driven so a swipe can retarget mid-way.
  //
  // Swipe translate lives on its own layer so it never shares a transform with
  // the height animation.
  const photoContainerRef = useRef<HTMLDivElement>(null);
  const photoAreaRef = useRef<HTMLDivElement>(null);
  const hasHover = useHasHover();
  /** Includes fixed stage chrome (back / full screen) so control taps do not dismiss the UI. */
  const idleTargetRef = photoContainerRef;
  const swipeLayerRef = useRef<HTMLDivElement>(null);
  const contentScaleRef = useRef<HTMLDivElement>(null);
  const lastPhotoHeightRef = useRef<number | null>(null);
  const heightAnimationRef = useRef<{ targetHeight: number; stop: () => void } | null>(null);
  const swipeOffsetRef = useRef(0);
  const swipeBaseRef = useRef(0);
  const swipeSettleRef = useRef<(() => void) | null>(null);
  const peekDirRef = useRef<'left' | 'right' | null>(null);
  /** True from finger down until the swipe snaps or cancels. */
  const gestureActiveRef = useRef(false);
  const goToNextRef = useRef(goToNextPhoto);
  const goToPrevRef = useRef(goToPrevPhoto);
  useEffect(() => {
    goToNextRef.current = goToNextPhoto;
    goToPrevRef.current = goToPrevPhoto;
  }, [goToNextPhoto, goToPrevPhoto]);

  const applySwipeTransforms = useCallback((dx: number) => {
    swipeOffsetRef.current = dx;
    const swipeEl = swipeLayerRef.current;
    if (swipeEl) {
      swipeEl.style.transform = `translate3d(${dx}px, 0, 0)`;
    }
  }, []);

  const stopSwipeTransition = useCallback(() => {
    swipeSettleRef.current?.();
    swipeSettleRef.current = null;
    const swipeEl = swipeLayerRef.current;
    if (swipeEl) swipeEl.style.transition = 'none';
  }, []);

  const resetSwipeTransforms = useCallback(() => {
    stopSwipeTransition();
    swipeOffsetRef.current = 0;
    swipeBaseRef.current = 0;
    peekDirRef.current = null;
    const swipeEl = swipeLayerRef.current;
    if (swipeEl) {
      swipeEl.style.transition = 'none';
      // Flush the snap transition. Otherwise a previous-photo swipe (positive
      // translate) animates back to center and the cached image fades again.
      void swipeEl.offsetWidth;
      swipeEl.style.transform = '';
    }
  }, [stopSwipeTransition]);

  const animateSwipeTo = useCallback((
    targetDx: number,
    options?: { onDone?: () => void },
  ) => {
    stopSwipeTransition();
    const swipeEl = swipeLayerRef.current;
    applySwipeTransforms(readTranslateX(swipeEl) || swipeOffsetRef.current);
    if (swipeEl) void swipeEl.offsetWidth;
    if (swipeEl) swipeEl.style.transition = `transform ${SWIPE_SNAP_MS}ms ease-out`;
    applySwipeTransforms(targetDx);

    let settled = false;
    let timeout = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      swipeEl?.removeEventListener('transitionend', onEnd);
      if (swipeEl) swipeEl.style.transition = '';
      options?.onDone?.();
      swipeSettleRef.current = null;
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.propertyName !== 'transform') return;
      finish();
    };
    swipeEl?.addEventListener('transitionend', onEnd);
    timeout = window.setTimeout(finish, SWIPE_SNAP_MS + 80);
    swipeSettleRef.current = () => {
      settled = true;
      window.clearTimeout(timeout);
      swipeEl?.removeEventListener('transitionend', onEnd);
    };
  }, [applySwipeTransforms, stopSwipeTransition]);

  const layoutShortId = pendingShortId && pendingShortId !== currentPhotoShortId
    ? pendingShortId
    : currentPhotoShortId;
  const layoutPhoto = siblingPhotos.find((photo) => photo.shortId === layoutShortId) ?? null;
  const layoutWidth = layoutPhoto?.width ?? 0;
  const layoutHeight = layoutPhoto?.height ?? 0;

  useLayoutEffect(() => {
    const container = photoContainerRef.current;
    if (!container) return;
    if (window.matchMedia('(min-width: 768px)').matches) {
      heightAnimationRef.current?.stop();
      container.style.height = '';
      return;
    }
    // Carousel snap still in progress: keep the current height so the incoming
    // slide isn't resized underneath the one moving off.
    if (swipeSettleRef.current) return;
    if (layoutWidth <= 0 || layoutHeight <= 0) return;

    const maxH = measureAlbumPhotoMaxHeightPx(container);
    const targetHeight = getContainedPhotoSize(
      layoutWidth,
      layoutHeight,
      container.clientWidth,
      maxH,
    ).height;
    if (targetHeight <= 0) return;

    const inFlight = heightAnimationRef.current;
    if (inFlight && Number.isNaN(inFlight.targetHeight)) {
      inFlight.stop();
    }
    const running = heightAnimationRef.current;
    if (running && Math.abs(running.targetHeight - targetHeight) < 1) return;

    const renderedHeight = container.getBoundingClientRect().height;
    if (lastPhotoHeightRef.current == null) {
      lastPhotoHeightRef.current = renderedHeight > 1 ? renderedHeight : targetHeight;
      container.style.height = `${lastPhotoHeightRef.current}px`;
      return;
    }
    if (!running && Math.abs(lastPhotoHeightRef.current - targetHeight) < 1) {
      container.style.height = `${targetHeight}px`;
      lastPhotoHeightRef.current = targetHeight;
      return;
    }

    const fromHeight = running
      ? renderedHeight
      : lastPhotoHeightRef.current;
    running?.stop();

    const DURATION = 250;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const start = performance.now();
    let raf = 0;

    const apply = (height: number) => {
      container.style.height = `${height}px`;
    };

    const finish = () => {
      cancelAnimationFrame(raf);
      heightAnimationRef.current = null;
      container.style.height = `${targetHeight}px`;
      lastPhotoHeightRef.current = targetHeight;
    };

    if (prefersReducedMotion()) {
      finish();
      return;
    }

    // Lock the previous height before paint. The new aspect-ratio is already
    // on the element and would otherwise snap before the first animation frame.
    apply(fromHeight);

    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / DURATION));
      apply(fromHeight + (targetHeight - fromHeight) * easeOutCubic(t));
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        finish();
      }
    };
    raf = requestAnimationFrame(step);

    heightAnimationRef.current = {
      targetHeight,
      stop: () => {
        cancelAnimationFrame(raf);
        heightAnimationRef.current = null;
      },
    };
  }, [layoutShortId, layoutWidth, layoutHeight, swipeRestTick, showFilmstrip]);

  // Cancel in-flight animations on unmount.
  useEffect(() => () => {
    heightAnimationRef.current?.stop();
    swipeSettleRef.current?.();
  }, []);

  // Keep the locked height in sync with the viewport. Image decode must not
  // change it — that was restarting the landscape → portrait transition.
  useEffect(() => {
    const onResize = () => {
      if (window.matchMedia('(min-width: 768px)').matches) return;
      if (heightAnimationRef.current) return;
      const container = photoContainerRef.current;
      if (!container || layoutWidth <= 0 || layoutHeight <= 0) return;
      const next = getContainedPhotoSize(
        layoutWidth,
        layoutHeight,
        container.clientWidth,
        measureAlbumPhotoMaxHeightPx(container),
      ).height;
      if (next <= 0) return;
      container.style.height = `${next}px`;
      lastPhotoHeightRef.current = next;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [layoutWidth, layoutHeight, showFilmstrip]);

  const lockContainerHeight = useCallback(() => {
    const container = photoContainerRef.current;
    if (!container || container.style.height) return;
    container.style.height = `${container.getBoundingClientRect().height}px`;
  }, []);

  const handleSwipeGrab = useCallback(() => {
    gestureActiveRef.current = true;
    const heightAnim = heightAnimationRef.current;
    if (heightAnim && Number.isNaN(heightAnim.targetHeight)) {
      heightAnim.stop();
    }
    stopSwipeTransition();
    lockContainerHeight();
    const tx = readTranslateX(swipeLayerRef.current);
    // A fast follow-up swipe starts while the previous snap is parked a full
    // photo off-screen. Continuing from there slides every panel out of view.
    // Recenter on the photo we're already navigating to and drag from zero.
    if (Math.abs(tx) > 1) {
      peekDirRef.current = null;
      swipeOffsetRef.current = 0;
      swipeBaseRef.current = 0;
      const swipeEl = swipeLayerRef.current;
      if (swipeEl) {
        swipeEl.style.transition = 'none';
        void swipeEl.offsetWidth;
        swipeEl.style.transform = '';
      }
      const heading = getHeadingShortId();
      if (heading && heading !== currentPhotoShortId) setPendingShortId(heading);
      setPeekShortId(null);
      setSwipeRestTick((tick) => tick + 1);
      return;
    }
    swipeBaseRef.current = tx;
    applySwipeTransforms(tx);
  }, [
    applySwipeTransforms,
    currentPhotoShortId,
    getHeadingShortId,
    lockContainerHeight,
    setPendingShortId,
    stopSwipeTransition,
  ]);

  const handleSwipeDrag = useCallback((dx: number) => {
    let visual = swipeBaseRef.current + dx;
    if (visual < 0 && !hasNext) visual *= SWIPE_RUBBER_BAND;
    if (visual > 0 && !hasPrev) visual *= SWIPE_RUBBER_BAND;

    const dir = visual < -1 ? 'left' : visual > 1 ? 'right' : peekDirRef.current;
    if (dir && dir !== peekDirRef.current) {
      peekDirRef.current = dir;
      const peek = getNeighbor(dir === 'left' ? 'next' : 'prev');
      setPeekOrigin(dir === 'left' ? 'right' : 'left');
      setPeekShortId(peek?.shortId ?? null);
      preloadPhoto(peek?.url);
    }

    applySwipeTransforms(visual);
  }, [applySwipeTransforms, getNeighbor, hasNext, hasPrev]);

  const commitSwipe = useCallback((direction: 'next' | 'prev') => {
    gestureActiveRef.current = false;
    // Navigate immediately. Waiting for the snap let a second finger-down
    // cancel the transition and drop the route change, so the strip slid
    // back to the same photo.
    if (direction === 'next') goToNextRef.current();
    else goToPrevRef.current();
    const width = photoContainerRef.current?.offsetWidth ?? 0;
    if (!width) return;
    const distance = width + SWIPE_GAP_PX;
    const target = direction === 'next' ? -distance : distance;
    animateSwipeTo(target, {
      onDone: () => {
        gestureActiveRef.current = false;
        if (!heightAnimationRef.current) {
          heightAnimationRef.current = {
            targetHeight: Number.NaN,
            stop: () => { heightAnimationRef.current = null; },
          };
        }
        setSwipeRestTick((tick) => tick + 1);
      },
    });
  }, [animateSwipeTo]);

  const handleSwipeCancel = useCallback(() => {
    animateSwipeTo(0, {
      onDone: () => {
        gestureActiveRef.current = false;
        peekDirRef.current = null;
        swipeOffsetRef.current = 0;
        swipeBaseRef.current = 0;
        const swipeEl = swipeLayerRef.current;
        if (swipeEl) {
          swipeEl.style.transition = '';
          swipeEl.style.transform = '';
        }
        const container = photoContainerRef.current;
        if (container && !heightAnimationRef.current) {
          container.style.height = '';
        }
        setPeekShortId(null);
      },
    });
  }, [animateSwipeTo]);

  const swipeHandlers = useHorizontalSwipe({
    onGrab: handleSwipeGrab,
    onDrag: handleSwipeDrag,
    onSwipeLeft: () => commitSwipe('next'),
    onSwipeRight: () => commitSwipe('prev'),
    onCancel: handleSwipeCancel,
    canSwipeLeft: hasNext,
    canSwipeRight: hasPrev,
    disabled: !showFilmstrip,
  });

  const peekPhoto = peekShortId
    ? siblingPhotos.find((photo) => photo.shortId === peekShortId) ?? null
    : null;
  const pendingPhoto = pendingShortId
    ? siblingPhotos.find((photo) => photo.shortId === pendingShortId) ?? null
    : null;
  // While the peek is the photo we just committed to, the live page is still
  // the one sliding out. A fast follow-up peeks the photo after that, so the
  // center has to be the committed photo's blurhash, not the stale page.
  const peekIsDestination = !!pendingPhoto && peekPhoto?.shortId === pendingPhoto.shortId;
  const hidePageSlotBehindPreview = !!pendingPhoto && !peekIsDestination;
  const slidingStandIn = hidePageSlotBehindPreview && peekPhoto ? pendingPhoto : null;
  const routeCoverPhoto = hidePageSlotBehindPreview && !peekPhoto ? pendingPhoto : null;

  // Same handoff as main: the swipe cover stays until the page image has
  // finished its own fade (opacity-100) and decoded. Lifting earlier shows
  // the page blurhash through a new <img> that is not painted yet.
  useEffect(() => {
    if (!pendingShortId || pendingShortId !== currentPhotoShortId) return;

    const photo = siblingPhotos.find((item) => item.shortId === pendingShortId);
    if (!photo) {
      resetSwipeTransforms();
      const frameId = requestAnimationFrame(() => {
        setPeekShortId(null);
        setPendingShortId(null);
      });
      return () => cancelAnimationFrame(frameId);
    }

    let cancelled = false;
    let frameId = 0;

    const liftOverlay = () => {
      if (cancelled || gestureActiveRef.current) return;
      resetSwipeTransforms();
      const img = photoContainerRef.current?.querySelector('[data-photo-page-image] img');
      const reveal = () => {
        if (cancelled || gestureActiveRef.current) return;
        setPeekShortId(null);
        setPendingShortId(null);
      };
      const painted = () => {
        requestAnimationFrame(() => requestAnimationFrame(reveal));
      };
      if (img instanceof HTMLImageElement) {
        img.decode().then(painted, painted);
      } else {
        painted();
      }
    };

    const poll = () => {
      if (cancelled) return;
      if (gestureActiveRef.current || swipeSettleRef.current || heightAnimationRef.current) {
        frameId = requestAnimationFrame(poll);
        return;
      }
      const frames = photoContainerRef.current?.querySelectorAll('[data-photo-page-image]');
      let ready = false;
      frames?.forEach((frame) => {
        if (ready || frame.getAttribute('data-photo-page-src') !== photo.url) return;
        const gallery = frame.closest('#gallery');
        if (gallery && getComputedStyle(gallery).display === 'none') return;
        const img = frame.querySelector('img');
        ready = img instanceof HTMLImageElement
          && img.complete
          && img.naturalWidth > 0
          && img.classList.contains('opacity-100');
      });
      if (ready) {
        liftOverlay();
        return;
      }
      frameId = requestAnimationFrame(poll);
    };
    frameId = requestAnimationFrame(poll);

    const fallback = window.setTimeout(liftOverlay, 3000);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(fallback);
    };
  }, [
    children,
    currentPhotoShortId,
    pendingShortId,
    resetSwipeTransforms,
    setPendingShortId,
    siblingPhotos,
  ]);

  const collectionFallbackHref = getPhotoCollectionFallbackHref({
    nickname,
    albumSlug,
    basePath,
  });

  return (
    <div
      className="w-full px-4 pt-4 max-md:px-3 max-md:pt-3 md:p-4 md:flex md:gap-4 md:items-stretch lg:p-8 lg:gap-8"
    >
      <section
        aria-label="Photo viewer"
        className={clsx(
          'md:flex-1 md:sticky md:self-start md:top-22.5 md:h-[calc(100vh-106px)] lg:top-26.5 lg:h-[calc(100vh-138px)] md:flex md:flex-col',
          !showFilmstrip && 'max-md:mb-3',
        )}
      >
        <PhotoStageChromeSlotProvider
          value={{
            fallbackHref: collectionFallbackHref,
            fallbackLabel,
            idleRevealRouteKey: showFilmstrip ? collectionFallbackHref : undefined,
          }}
        >
          <PhotoLightboxOpenProvider>
            <div
              ref={photoContainerRef}
              data-photo-mobile-stage=""
              className={clsx(
                'relative flex w-full touch-pan-y select-none items-center justify-center overflow-hidden md:min-h-0 md:flex-1 md:aspect-auto md:max-h-none max-md:aspect-(--photo-ar) [&_img]:[-webkit-user-drag:none]',
                showFilmstrip
                  ? 'max-md:max-h-[calc(100vh-162px)] sm:max-md:max-h-[calc(100vh-180px)] max-md:[--photo-max-h:calc(100vh-162px)] sm:max-md:[--photo-max-h:calc(100vh-180px)]'
                  : 'max-md:max-h-[calc(100vh-98px)] sm:max-md:max-h-[calc(100vh-114px)] max-md:[--photo-max-h:calc(100vh-98px)] sm:max-md:[--photo-max-h:calc(100vh-114px)]',
              )}
              style={layoutWidth > 0 ? { ['--photo-ar' as string]: `${layoutWidth} / ${layoutHeight}` } : undefined}
              {...swipeHandlers}
            >
              <PhotoStageIdleRevealProvider
                targetRef={idleTargetRef}
                routeKey={pathname}
                chromeRouteKey={showFilmstrip ? collectionFallbackHref : pathname}
              >
                <PhotoPageFixedStageChrome />
                <div
                  ref={photoAreaRef}
                  className={clsx(
                    'relative flex w-full items-center justify-center max-md:absolute max-md:inset-0 md:h-full',
                    hasHover && 'md:contents',
                  )}
                >
                  <div
                    ref={swipeLayerRef}
                    className="absolute inset-0"
                  >
                    <div
                      ref={contentScaleRef}
                      data-photo-stage-slot=""
                      className={clsx(
                        'flex h-full w-full items-center justify-center max-md:absolute max-md:inset-0',
                        hidePageSlotBehindPreview && 'invisible',
                      )}
                    >
                      {children}
                    </div>
                    {slidingStandIn && (
                      <div
                        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background"
                      >
                        <PhotoSwipeCover
                          photo={slidingStandIn}
                        />
                      </div>
                    )}
                    {peekPhoto && (
                      <div
                        data-photo-stage-slot=""
                        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background"
                        style={{
                          transform: peekOrigin === 'left'
                            ? `translateX(calc(-100% - ${SWIPE_GAP_PX}px))`
                            : `translateX(calc(100% + ${SWIPE_GAP_PX}px))`,
                        }}
                      >
                        <PhotoSwipeCover
                          photo={peekPhoto}
                        />
                      </div>
                    )}
                  </div>
                  {routeCoverPhoto && (
                    <div
                      data-photo-stage-preview=""
                      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background"
                    >
                      <PhotoSwipeCover
                        photo={routeCoverPhoto}
                      />
                    </div>
                  )}
                </div>
              </PhotoStageIdleRevealProvider>
            </div>
          </PhotoLightboxOpenProvider>
        </PhotoStageChromeSlotProvider>
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
      </section>

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
      <PhotoFilmstripShellInner
        {...props}
      />
    </PhotoNavigationProvider>
  );
}
