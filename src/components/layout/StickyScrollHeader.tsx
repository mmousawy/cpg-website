'use client';

import clsx from 'clsx';
import { useLayoutEffect, useRef } from 'react';

/** Matches Tailwind `max-sm` — same breakpoint where the site header is hidden. */
const MOBILE_STICKY_MEDIA = '(max-width: 639px)';

type StickyScrollHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

export default function StickyScrollHeader({ children, className }: StickyScrollHeaderProps) {
  const flowRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const hideOffsetRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const heightRef = useRef(0);
  const borderBrightRef = useRef(false);

  useLayoutEffect(() => {
    const flow = flowRef.current;
    const sticky = stickyRef.current;
    const inner = innerRef.current;
    if (!flow || !sticky || !inner) return;

    const mediaQuery = window.matchMedia(MOBILE_STICKY_MEDIA);

    const updateBorder = () => {
      const headerHeight = inner.offsetHeight;
      const atTop = window.scrollY <= 0.5;
      const scrolledPastHeader = headerHeight > 0 && flow.getBoundingClientRect().top <= -headerHeight;

      if (atTop) {
        borderBrightRef.current = false;
      } else if (scrolledPastHeader) {
        borderBrightRef.current = true;
      }

      if (borderBrightRef.current) {
        delete inner.dataset.settled;
      } else {
        inner.dataset.settled = '';
      }
    };

    const reset = () => {
      hideOffsetRef.current = 0;
      borderBrightRef.current = false;
      inner.style.transform = '';
      updateBorder();
    };

    const updateHeight = () => {
      heightRef.current = inner.offsetHeight;
    };

    const applyTransform = () => {
      inner.style.transform = hideOffsetRef.current > 0
        ? `translateY(-${hideOffsetRef.current}px)`
        : '';
    };

    const onScroll = () => {
      if (!mediaQuery.matches) {
        reset();
        return;
      }

      const scrollY = Math.max(0, window.scrollY);
      const delta = scrollY - lastScrollYRef.current;
      lastScrollYRef.current = scrollY;

      if (scrollY <= 0) {
        hideOffsetRef.current = 0;
        applyTransform();
        updateBorder();
        return;
      }

      const isStuck = sticky.getBoundingClientRect().top <= 0.5;

      if (!isStuck) {
        hideOffsetRef.current = 0;
      } else {
        const maxHide = heightRef.current;
        hideOffsetRef.current = Math.min(maxHide, Math.max(0, hideOffsetRef.current + delta));
      }

      applyTransform();
      updateBorder();
    };

    const onLayoutChange = () => {
      if (!mediaQuery.matches) {
        reset();
        return;
      }
      updateHeight();
      onScroll();
    };

    const resizeObserver = new ResizeObserver(onLayoutChange);
    resizeObserver.observe(inner);

    const onMediaChange = () => {
      if (!mediaQuery.matches) {
        reset();
        return;
      }
      updateHeight();
      lastScrollYRef.current = window.scrollY;
      onScroll();
    };

    if (mediaQuery.matches) {
      updateHeight();
      lastScrollYRef.current = window.scrollY;
      onScroll();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onLayoutChange, { passive: true });
    mediaQuery.addEventListener('change', onMediaChange);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onLayoutChange);
      mediaQuery.removeEventListener('change', onMediaChange);
      reset();
    };
  }, []);

  return (
    <>
      <div ref={flowRef} className="max-sm:h-0" aria-hidden />
      <div
        ref={stickyRef}
        className={clsx(
          'max-sm:sticky max-sm:top-0 max-sm:z-20 max-sm:pointer-events-none',
          className,
        )}
      >
        <div
          ref={innerRef}
          className="max-sm:pointer-events-auto max-sm:-mx-3 max-sm:border-b max-sm:border-border-color max-sm:bg-background max-sm:px-3 max-sm:py-2.5 max-sm:transition-[border-color] max-sm:data-settled:border-background"
          data-settled=""
        >
          {children}
        </div>
      </div>
    </>
  );
}
