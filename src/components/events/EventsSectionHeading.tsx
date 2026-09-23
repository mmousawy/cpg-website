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

function getSectionHeadingStickyTopPx() {
  if (typeof window === 'undefined') return 0;
  if (window.matchMedia('(min-width: 640px)').matches) {
    const fromVar = readCssPx('--app-header-height');
    if (fromVar > 0) return fromVar;
    const header = document.querySelector('header');
    return header?.getBoundingClientRect().height ?? 0;
  }
  return readCssPx('--sticky-page-heading-height');
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
        'top-(--sticky-page-heading-height,0px) sm:top-(--app-header-height,4.5625rem)',
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
