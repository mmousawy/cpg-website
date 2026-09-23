'use client';

import clsx from 'clsx';
import { useLayoutEffect, useRef } from 'react';

import { getScrollContainer, getScrollTop, subscribeScrollContainer } from '@/utils/scrollContainer';

/** Mobile-only sticky page title chrome (`max-sm`). */
const MOBILE_STICKY_MEDIA = '(max-width: 639px)';

/** Visible height of the mobile sticky page title; used by other sticky rows (e.g. section headings). */
export const STICKY_PAGE_HEADING_HEIGHT_VAR = '--sticky-page-heading-height';

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

    const scrollPortTop = () => {
      const container = getScrollContainer();
      return container ? container.getBoundingClientRect().top : 0;
    };

    const updateBorder = () => {
      const headerHeight = inner.offsetHeight;
      const atTop = getScrollTop() <= 0.5;
      const scrolledPastHeader =
        headerHeight > 0 && flow.getBoundingClientRect().top <= scrollPortTop() - headerHeight;

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

    const syncStickyPageHeadingInset = () => {
      if (!mediaQuery.matches) {
        document.documentElement.style.setProperty(STICKY_PAGE_HEADING_HEIGHT_VAR, '0px');
        return;
      }

      const scrollY = Math.max(0, getScrollTop());
      const isStuck = sticky.getBoundingClientRect().top <= scrollPortTop() + 0.5;
      const visibleChrome =
        isStuck && scrollY > 0
          ? Math.max(0, heightRef.current - hideOffsetRef.current)
          : 0;

      document.documentElement.style.setProperty(
        STICKY_PAGE_HEADING_HEIGHT_VAR,
        `${visibleChrome}px`,
      );
    };

    const reset = () => {
      hideOffsetRef.current = 0;
      borderBrightRef.current = false;
      inner.style.transform = '';
      document.documentElement.style.setProperty(STICKY_PAGE_HEADING_HEIGHT_VAR, '0px');
      updateBorder();
    };

    const updateHeight = () => {
      heightRef.current = inner.offsetHeight;
      syncStickyPageHeadingInset();
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

      const scrollY = Math.max(0, getScrollTop());
      const delta = scrollY - lastScrollYRef.current;
      lastScrollYRef.current = scrollY;

      if (scrollY <= 0) {
        hideOffsetRef.current = 0;
        applyTransform();
        updateBorder();
        syncStickyPageHeadingInset();
        return;
      }

      const isStuck = sticky.getBoundingClientRect().top <= scrollPortTop() + 0.5;

      if (!isStuck) {
        hideOffsetRef.current = 0;
      } else {
        const maxHide = heightRef.current;
        hideOffsetRef.current = Math.min(maxHide, Math.max(0, hideOffsetRef.current + delta));
      }

      applyTransform();
      updateBorder();
      syncStickyPageHeadingInset();
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
      lastScrollYRef.current = getScrollTop();
      onScroll();
    };

    if (mediaQuery.matches) {
      updateHeight();
      lastScrollYRef.current = getScrollTop();
      onScroll();
    }

    const unsubscribeScroll = subscribeScrollContainer(onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onLayoutChange, { passive: true });
    mediaQuery.addEventListener('change', onMediaChange);

    return () => {
      resizeObserver.disconnect();
      unsubscribeScroll();
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
          'max-sm:sticky max-sm:top-0 max-sm:z-30 max-sm:pointer-events-none',
          className,
        )}
      >
        <div
          ref={innerRef}
          data-sticky-page-heading=""
          className="max-sm:pointer-events-auto max-sm:-mx-3 max-sm:border-b max-sm:border-border-color max-sm:bg-background max-sm:px-3 max-sm:py-2.5 max-sm:transition-[border-color] max-sm:data-settled:border-background"
          data-settled=""
        >
          {children}
        </div>
      </div>
    </>
  );
}
