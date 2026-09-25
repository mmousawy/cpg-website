'use client';

import clsx from 'clsx';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { getScrollContainer, subscribeScrollContainer } from '@/utils/scrollContainer';

type EventsSectionHeadingProps = {
  children: ReactNode
  className?: string
};

function parsePx(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readCssPx(variable: string) {
  return parsePx(getComputedStyle(document.documentElement).getPropertyValue(variable));
}

/** Overlap the bar above so 1.5x DPR subpixel rounding cannot leave a hairline gap. */
const STICKY_SUBTITLE_OVERLAP_PX = 1;

function getSectionHeadingStickyTopPx() {
  if (typeof window === 'undefined') return 0;
  if (window.matchMedia('(min-width: 640px)').matches) {
    const fromVar = readCssPx('--app-header-height');
    const headerHeight = fromVar > 0
      ? fromVar
      : (document.querySelector('header')?.getBoundingClientRect().height ?? 0);
    return Math.max(0, headerHeight - STICKY_SUBTITLE_OVERLAP_PX);
  }
  return Math.max(0, readCssPx('--sticky-page-heading-height') - STICKY_SUBTITLE_OVERLAP_PX);
}

function useSectionHeadingStuck(headingRef: React.RefObject<HTMLElement | null>) {
  const [isStuck, setIsStuck] = useState(false);

  useLayoutEffect(() => {
    const el = headingRef.current;
    if (!el) return;

    const scrollPortTop = () => {
      const container = getScrollContainer();
      return container ? container.getBoundingClientRect().top : 0;
    };

    const update = () => {
      const pinTop = getSectionHeadingStickyTopPx();
      const stuck = el.getBoundingClientRect().top <= scrollPortTop() + pinTop + 0.5;
      setIsStuck(stuck);
    };

    update();
    const unsubscribeScroll = subscribeScrollContainer(update);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    return () => {
      unsubscribeScroll();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [headingRef]);

  return isStuck;
}

export default function EventsSectionHeading({ children, className }: EventsSectionHeadingProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isStuck = useSectionHeadingStuck(headingRef);

  return (
    <h2
      ref={headingRef}
      className={clsx(
        'sticky z-10 -mx-3 px-3 py-2 mb-2 sm:mx-0 sm:px-0',
        'top-[calc(var(--sticky-page-heading-height,0px)-1px)] sm:top-[calc(var(--app-header-height,4.5625rem)-1px)]',
        'bg-background/80 backdrop-blur-sm',
        'border-b transition-[border-color]',
        isStuck ? 'border-border-color' : 'border-transparent',
        'text-xl font-semibold font-heading text-foreground',
        className,
      )}
    >
      {children}
    </h2>
  );
}
