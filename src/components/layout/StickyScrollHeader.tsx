'use client';

import clsx from 'clsx';
import { useLayoutEffect, useRef } from 'react';

import { getScrollTop, subscribeScrollContainer } from '@/utils/scrollContainer';

/** Mobile-only sticky page title chrome (`max-sm`). */
const MOBILE_STICKY_MEDIA = '(max-width: 639px)';

/** Visible height of the mobile sticky page title; used by other sticky rows (e.g. section headings). */
export const STICKY_PAGE_HEADING_HEIGHT_VAR = '--sticky-page-heading-height';

/** Full title height. */
const STICKY_PAGE_HEADING_SIZE_VAR = '--sticky-page-heading-size';

type StickyScrollHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

export default function StickyScrollHeader({ children, className }: StickyScrollHeaderProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(0);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const mediaQuery = window.matchMedia(MOBILE_STICKY_MEDIA);
    const root = document.documentElement;
    let lastInset = '';
    let borderSettled = true;
    let hiddenPx = 0;
    let lastScrollY = getScrollTop();

    const setInset = (px: number) => {
      const next = `${px}px`;
      if (next === lastInset) return;
      lastInset = next;
      root.style.setProperty(STICKY_PAGE_HEADING_HEIGHT_VAR, next);
    };

    const setHidden = (px: number) => {
      hiddenPx = px;
      inner.style.transform = px === 0 ? 'translateY(0)' : `translateY(-${px}px)`;
    };

    const applyChrome = () => {
      const height = heightRef.current;

      if (!mediaQuery.matches) {
        hiddenPx = 0;
        inner.style.transform = '';
        setInset(0);
        root.style.setProperty(STICKY_PAGE_HEADING_SIZE_VAR, '0px');
        if (!borderSettled) {
          borderSettled = true;
          inner.dataset.settled = '';
        }
        return;
      }

      root.style.setProperty(STICKY_PAGE_HEADING_SIZE_VAR, `${height}px`);

      const scrollY = Math.max(0, getScrollTop());
      const delta = scrollY - lastScrollY;
      lastScrollY = scrollY;

      if (scrollY <= 0 || height <= 0) {
        setHidden(0);
        setInset(0);
      } else {
        const nextHidden = Math.min(height, Math.max(0, hiddenPx + delta));
        const clamped = Math.min(nextHidden, scrollY);
        setHidden(clamped);
        setInset(height - clamped);
      }

      const settled = scrollY <= 0.5;
      if (settled === borderSettled) return;
      borderSettled = settled;
      if (settled) {
        inner.dataset.settled = '';
      } else {
        delete inner.dataset.settled;
      }
    };

    const updateHeight = () => {
      heightRef.current = inner.offsetHeight;
      lastInset = '';
      hiddenPx = Math.min(hiddenPx, heightRef.current);
      root.style.setProperty(
        STICKY_PAGE_HEADING_SIZE_VAR,
        mediaQuery.matches ? `${heightRef.current}px` : '0px',
      );
      applyChrome();
    };

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(inner);

    if (mediaQuery.matches) updateHeight();

    const unsubscribeScroll = subscribeScrollContainer(applyChrome);
    window.addEventListener('resize', updateHeight, { passive: true });
    mediaQuery.addEventListener('change', updateHeight);

    return () => {
      resizeObserver.disconnect();
      unsubscribeScroll();
      window.removeEventListener('resize', updateHeight);
      mediaQuery.removeEventListener('change', updateHeight);
      inner.style.transform = '';
      root.style.setProperty(STICKY_PAGE_HEADING_HEIGHT_VAR, '0px');
      root.style.setProperty(STICKY_PAGE_HEADING_SIZE_VAR, '0px');
    };
  }, []);

  return (
    <>
      <div
        className={clsx(
          'max-sm:sticky max-sm:top-0 max-sm:z-30 max-sm:pointer-events-none',
          className,
        )}
      >
        <div
          ref={innerRef}
          data-sticky-page-heading=""
          className="max-sm:pointer-events-auto max-sm:-mx-3 max-sm:border-b max-sm:border-border-color max-sm:bg-background max-sm:px-3 max-sm:py-2.5 max-sm:transition-[border-color] max-sm:duration-200 max-sm:data-settled:border-background"
          data-settled=""
        >
          {children}
        </div>
      </div>
    </>
  );
}
