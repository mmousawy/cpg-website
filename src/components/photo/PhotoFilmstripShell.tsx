'use client';

import AlbumFilmstrip from '@/components/photo/AlbumFilmstrip';
import {
  PhotoNavigationProvider,
  usePhotoNavigation,
} from '@/components/photo/PhotoNavigationContext';
import { useCollectionPhotoNavigation } from '@/components/photo/useCollectionPhotoNavigation';
import type { SiblingPhoto } from '@/components/photo/PhotoPageContent';
import BlurImage from '@/components/shared/BlurImage';
import { useHorizontalSwipe } from '@/hooks/useHorizontalSwipe';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

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
const SWIPE_RUBBER_BAND = 0.32;

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
  const showFilmstrip = siblingPhotos.length > 1;
  const [peekShortId, setPeekShortId] = useState<string | null>(null);
  const [peekOrigin, setPeekOrigin] = useState<'left' | 'right'>('right');
  const [swipeLocked, setSwipeLocked] = useState(false);
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
    hasPrev,
    hasNext,
    goToPrevPhoto,
    goToNextPhoto,
  } = useCollectionPhotoNavigation({
    photos: siblingPhotos,
    currentPhotoShortId,
    getPhotoHref,
  });

  // Smoothly resize the photo container between photos on mobile so navigation
  // doesn't snap the layout. Desktop uses a fixed-height column, so it's skipped.
  // The animation starts as soon as the overlay appears on click (the overlay
  // renders the target photo at its final aspect ratio, so its height is the
  // target), and is retargeted to the real content at route commit. While the
  // container animates, both the overlay image and the content underneath are
  // scaled to stay fully visible inside it. rAF-driven (not CSS transitions) so
  // the animation can be interrupted and retargeted smoothly.
  //
  // Swipe translate lives on a separate layer from height scale so the two
  // transforms never overwrite each other.
  const photoContainerRef = useRef<HTMLDivElement>(null);
  const swipeLayerRef = useRef<HTMLDivElement>(null);
  const contentScaleRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastPhotoHeightRef = useRef<number | null>(null);
  const heightAnimationRef = useRef<{ targetHeight: number; stop: () => void } | null>(null);
  const swipeOffsetRef = useRef(0);
  const swipeBaseRef = useRef(0);
  const swipeSettleRef = useRef<(() => void) | null>(null);
  const peekDirRef = useRef<'left' | 'right' | null>(null);

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
      swipeEl.style.transition = '';
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

  useLayoutEffect(() => {
    const container = photoContainerRef.current;
    if (!container) return;
    if (window.matchMedia('(min-width: 768px)').matches) {
      if (heightAnimationRef.current && Number.isNaN(heightAnimationRef.current.targetHeight)) {
        heightAnimationRef.current.stop();
      }
      return;
    }
    // Carousel snap still in progress: keep the current height so the peeking
    // photo isn't scaled down (that opens a gap of background between slides).
    if (swipeSettleRef.current) return;

    // What to measure for the target height. After the route commits, the
    // scale layer holds the new photo and reflects the intrinsic content height.
    // Before commit (overlay just appeared on click), the scale layer still holds
    // the old photo, so measure the overlay's image instead. offsetHeight is
    // transform-free, so mid-animation scale doesn't skew the measurement.
    const isPreCommit = !!(pendingShortId && pendingShortId !== currentPhotoShortId);
    const overlayContent = overlayRef.current?.firstElementChild as HTMLElement | null;
    const wrapper = contentScaleRef.current;
    const contentEl = (isPreCommit && overlayContent) || wrapper;
    const targetHeight = contentEl
      ? contentEl.offsetHeight
      : container.getBoundingClientRect().height;

    const prevHeight = lastPhotoHeightRef.current;
    lastPhotoHeightRef.current = targetHeight;

    if (heightAnimationRef.current && Number.isNaN(heightAnimationRef.current.targetHeight)) {
      heightAnimationRef.current.stop();
    }
    const inFlight = heightAnimationRef.current;
    // The running loop already targets this height (e.g. route committed after
    // a pre-commit animation): let it finish — it reads the DOM fresh each frame.
    if (inFlight && Math.abs(targetHeight - inFlight.targetHeight) < 1) return;
    if (prevHeight == null) return;
    if (!inFlight && Math.abs(targetHeight - prevHeight) < 1) {
      // Same height (or swipe lock matching the new photo): drop the inline lock.
      container.style.height = '';
      return;
    }

    const fromHeight = inFlight
      ? container.getBoundingClientRect().height
      : prevHeight;
    inFlight?.stop();

    const DURATION = 250;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const start = performance.now();
    let raf = 0;

    const apply = (height: number) => {
      container.style.height = `${height}px`;
      // Keep the photo fully visible inside the animating container: scale it
      // down while the container is smaller than the target, never up. Applies
      // to the overlay image and the content wrapper alike so the overlay lift
      // is seamless. Translate for swipe lives on a parent layer.
      const transform =
        height < targetHeight ? `scale(${height / targetHeight})` : '';
      const wrapperEl = contentScaleRef.current;
      if (wrapperEl) wrapperEl.style.transform = transform;
      const overlayEl = overlayRef.current?.firstElementChild as HTMLElement | null;
      if (overlayEl) overlayEl.style.transform = transform;
    };

    const finish = () => {
      cancelAnimationFrame(raf);
      heightAnimationRef.current = null;
      const wrapperEl = contentScaleRef.current;
      if (wrapperEl) wrapperEl.style.transform = '';
      const overlayEl = overlayRef.current?.firstElementChild as HTMLElement | null;
      if (overlayEl) overlayEl.style.transform = '';
      if (wrapperEl && Math.abs(wrapperEl.offsetHeight - targetHeight) < 1) {
        // Content is at the target — restore natural sizing.
        container.style.height = '';
      } else {
        // Route hasn't committed yet — hold the target height until the
        // ResizeObserver sees the new content arrive.
        container.style.height = `${targetHeight}px`;
      }
    };

    // Apply the start state synchronously so the first painted frame already
    // shows the previous height, not the snapped new one.
    apply(fromHeight);

    const step = (now: number) => {
      // Clamp: the rAF timestamp is the frame's vsync time, which can be
      // earlier than the `start` captured in this layout effect.
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
  }, [currentPhotoShortId, pendingShortId, swipeRestTick]);

  // Cancel in-flight animations on unmount.
  useEffect(() => () => {
    heightAnimationRef.current?.stop();
    swipeSettleRef.current?.();
  }, []);

  // Keep lastPhotoHeightRef in sync with the content's intrinsic height between
  // navigations (font loads, image decode, filmstrip changes can drift it), so
  // the animation always starts from the true current height. Also releases a
  // held pre-commit height once the new content arrives.
  useEffect(() => {
    const wrapper = contentScaleRef.current;
    const container = photoContainerRef.current;
    if (!container || !wrapper) return;

    const observer = new ResizeObserver(() => {
      if (heightAnimationRef.current) return; // mid-animation: target already stored
      if (container.style.height) {
        // Held pre-commit height: clear once the content catches up. Don't
        // update the ref from the stale (old) content while held.
        const held = parseFloat(container.style.height);
        if (Math.abs(wrapper.getBoundingClientRect().height - held) < 1) {
          container.style.height = '';
          wrapper.style.transform = '';
          lastPhotoHeightRef.current = wrapper.getBoundingClientRect().height;
        }
        return;
      }
      lastPhotoHeightRef.current = wrapper.getBoundingClientRect().height;
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  const lockContainerHeight = useCallback(() => {
    const container = photoContainerRef.current;
    if (!container || container.style.height) return;
    container.style.height = `${container.getBoundingClientRect().height}px`;
  }, []);

  const handleSwipeGrab = useCallback(() => {
    stopSwipeTransition();
    lockContainerHeight();
    const tx = readTranslateX(swipeLayerRef.current);
    swipeBaseRef.current = tx;
    applySwipeTransforms(tx);
  }, [applySwipeTransforms, lockContainerHeight, stopSwipeTransition]);

  const handleSwipeDrag = useCallback((dx: number) => {
    let visual = swipeBaseRef.current + dx;
    if (visual < 0 && !hasNext) visual *= SWIPE_RUBBER_BAND;
    if (visual > 0 && !hasPrev) visual *= SWIPE_RUBBER_BAND;

    const dir = visual < -1 ? 'left' : visual > 1 ? 'right' : peekDirRef.current;
    if (dir && dir !== peekDirRef.current) {
      peekDirRef.current = dir;
      const peek = dir === 'left'
        ? (hasNext ? siblingPhotos[currentIndex + 1] : null)
        : (hasPrev ? siblingPhotos[currentIndex - 1] : null);
      setPeekOrigin(dir === 'left' ? 'right' : 'left');
      setPeekShortId(peek?.shortId ?? null);
    }

    applySwipeTransforms(visual);
  }, [applySwipeTransforms, currentIndex, hasNext, hasPrev, siblingPhotos]);

  const commitSwipe = useCallback((direction: 'next' | 'prev') => {
    const width = photoContainerRef.current?.offsetWidth ?? 0;
    if (!width) {
      if (direction === 'next') goToNextPhoto();
      else goToPrevPhoto();
      return;
    }
    setSwipeLocked(true);
    const target = direction === 'next' ? -width : width;
    animateSwipeTo(target, {
      onDone: () => {
        // Navigate only after the old photo is off-screen. Committing earlier
        // replaces the sliding layer with the incoming photo while it's still
        // on-screen (especially prev: +translate keeps it in view) — that's
        // the center-pop then the rest of the swipe finishing.
        if (direction === 'next') goToNextPhoto();
        else goToPrevPhoto();
        if (!heightAnimationRef.current) {
          heightAnimationRef.current = {
            targetHeight: Number.NaN,
            stop: () => { heightAnimationRef.current = null; },
          };
        }
        setSwipeRestTick((tick) => tick + 1);
      },
    });
  }, [animateSwipeTo, goToNextPhoto, goToPrevPhoto]);

  const handleSwipeCancel = useCallback(() => {
    animateSwipeTo(0, {
      onDone: () => {
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
    disabled: !showFilmstrip || swipeLocked,
  });

  const peekPhoto = peekShortId
    ? siblingPhotos.find((photo) => photo.shortId === peekShortId)
    : null;
  const clickOverlayPhoto = !peekPhoto && pendingShortId
    ? siblingPhotos.find((photo) => photo.shortId === pendingShortId)
    : null;

  const overlayCallbackRef = useCallback((node: HTMLDivElement | null) => {
    overlayRef.current = node;
  }, []);

  // Keep the overlay until the real photo underneath is fully visible, then
  // lift it. Lifting earlier races the children's BlurImage: a fresh <img>
  // element can need a frame or two to decode even when memory-cached, and its
  // fade-in can start a task later than the overlay's own load — both flash the
  // blurhash layer that sits behind the image. So poll the actual DOM: the
  // target photo's img, fully loaded, fade completed ('opacity-100'), and
  // decoded. The overlay shows the same photo at the same scale, so holding it
  // longer is invisible.
  useEffect(() => {
    if (!pendingShortId || pendingShortId !== currentPhotoShortId) return;

    const photo = siblingPhotos.find((p) => p.shortId === pendingShortId);
    if (!photo) {
      resetSwipeTransforms();
      setPeekShortId(null);
      setSwipeLocked(false);
      setPendingShortId(null);
      return;
    }

    let cancelled = false;
    let frameId = 0;

    const liftOverlay = () => {
      if (cancelled) return;
      // Bring the real photo on-screen UNDER the overlay first. Lifting in the
      // same turn leaves the first on-screen paint of children uncovered —
      // they were sitting at ±100% width (especially +width for prev) and
      // often haven't been rasterized yet, which flashes blurhash/blank.
      resetSwipeTransforms();
      const img = photoContainerRef.current?.querySelector('#gallery img');
      const reveal = () => {
        if (cancelled) return;
        setPeekShortId(null);
        setSwipeLocked(false);
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
      // Wait for the swipe snap (and any following height animation) to
      // finish so we don't lift onto a photo that's about to scale/grow.
      if (swipeSettleRef.current || heightAnimationRef.current) {
        frameId = requestAnimationFrame(poll);
        return;
      }
      const anchor = photoContainerRef.current?.querySelector('#gallery a');
      const img = anchor?.querySelector('img');
      // The anchor href identifies the committed photo — guards against the
      // pathname committing before the page slot (stale old-photo img).
      const isTargetImg = anchor?.getAttribute('href') === photo.url;
      // BlurImage sets 'opacity-100' only once the fade-in has completed (or
      // immediately when mounted from the SPA cache).
      if (isTargetImg && img?.complete && img.naturalWidth > 0 && img.classList.contains('opacity-100')) {
        liftOverlay();
        return;
      }
      frameId = requestAnimationFrame(poll);
    };
    frameId = requestAnimationFrame(poll);

    const fallback = setTimeout(liftOverlay, 3000);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      clearTimeout(fallback);
    };
  }, [pendingShortId, currentPhotoShortId, siblingPhotos, setPendingShortId, resetSwipeTransforms]);

  return (
    <div
      className="w-full px-4 pt-4 md:p-4 md:flex md:gap-4 md:items-stretch lg:p-8 lg:gap-8"
    >
      <div
        className="md:flex-1 md:sticky md:self-start md:top-[90px] md:h-[calc(100vh-106px)] lg:top-[106px] lg:h-[calc(100vh-138px)] md:flex md:flex-col"
      >
        <div
          ref={photoContainerRef}
          className="relative flex flex-1 touch-pan-y items-center justify-center overflow-hidden"
          {...swipeHandlers}
        >
          <div
            ref={swipeLayerRef}
            className="relative flex w-full items-center justify-center"
          >
            <div
              ref={contentScaleRef}
              className="flex w-full items-center justify-center"
            >
              {children}
            </div>
            {peekPhoto && (
              <div
                ref={overlayCallbackRef}
                className="absolute inset-0 flex items-center justify-center bg-background"
                style={{
                  transform: peekOrigin === 'left' ? 'translateX(-100%)' : 'translateX(100%)',
                }}
              >
                <BlurImage
                  src={peekPhoto.url}
                  blurhash={peekPhoto.blurhash}
                  width={peekPhoto.width}
                  height={peekPhoto.height}
                  alt=""
                  contain
                  unoptimized
                  fadeIn={false}
                  className="max-h-[calc(100vh-154px)] sm:max-h-[calc(100vh-172px)] lg:max-h-[calc(100vh-218px)]"
                  style={{
                    aspectRatio: `${peekPhoto.width}/${peekPhoto.height}`,
                  }}
                />
              </div>
            )}
          </div>
          {clickOverlayPhoto && (
            <div
              ref={overlayCallbackRef}
              className="absolute inset-0 z-10 flex items-center justify-center bg-background"
            >
              <BlurImage
                src={clickOverlayPhoto.url}
                blurhash={clickOverlayPhoto.blurhash}
                width={clickOverlayPhoto.width}
                height={clickOverlayPhoto.height}
                alt=""
                contain
                unoptimized
                fadeIn={false}
                className="max-h-[calc(100vh-154px)] sm:max-h-[calc(100vh-172px)] lg:max-h-[calc(100vh-218px)]"
                style={{
                  aspectRatio: `${clickOverlayPhoto.width}/${clickOverlayPhoto.height}`,
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
