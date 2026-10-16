'use client';

import clsx from 'clsx';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

function DynamicHeading({
  as,
  className,
  children,
}: {
  as: 'h2' | 'h3';
  className?: string;
  children: ReactNode;
}) {
  if (as === 'h3') {
    return (
      <h3
        className={className}
      >
        {children}
      </h3>
    );
  }
  return (
    <h2
      className={className}
    >
      {children}
    </h2>
  );
}

import { getScrollContainer, subscribeScrollContainer } from '@/utils/scrollContainer';

type StickySectionHeadingProps = {
  children: ReactNode;
  className?: string;
  /** Shown on the same sticky row (e.g. link beside the title). */
  accessory?: ReactNode;
  /** Frosted bar background when the heading sits on a card surface. */
  surface?: 'page' | 'card';
  /** Also stick under the desktop site header (events list pages). */
  pinDesktop?: boolean;
  /** Use `div` when children include their own heading markup (e.g. linked titles). */
  as?: 'h2' | 'h3' | 'div';
  /** Extra classes on the sticky wrapper (e.g. tight bottom margin before a subtitle). */
  stickyClassName?: string;
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

function getSectionHeadingStickyTopPx(pinDesktop: boolean) {
  if (typeof window === 'undefined') return 0;
  if (pinDesktop && window.matchMedia('(min-width: 640px)').matches) {
    const fromVar = readCssPx('--app-header-height');
    const headerHeight = fromVar > 0
      ? fromVar
      : (document.querySelector('header')?.getBoundingClientRect().height ?? 0);
    return Math.max(0, headerHeight - STICKY_SUBTITLE_OVERLAP_PX);
  }
  return Math.max(0, readCssPx('--sticky-page-heading-height') - STICKY_SUBTITLE_OVERLAP_PX);
}

function useSectionHeadingStuck(
  headingRef: React.RefObject<HTMLElement | null>,
  pinDesktop: boolean,
) {
  const [isStuck, setIsStuck] = useState(false);

  useLayoutEffect(() => {
    const el = headingRef.current;
    if (!el) return;

    const scrollPortTop = () => {
      const container = getScrollContainer();
      return container ? container.getBoundingClientRect().top : 0;
    };

    const update = () => {
      const pinTop = getSectionHeadingStickyTopPx(pinDesktop);
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
  }, [headingRef, pinDesktop]);

  return isStuck;
}

export default function StickySectionHeading({
  children,
  className,
  accessory,
  surface = 'page',
  pinDesktop = false,
  as = 'h2',
  stickyClassName,
}: StickySectionHeadingProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const isStuck = useSectionHeadingStuck(rowRef, pinDesktop);

  const bgClass =
    surface === 'card'
      ? 'max-sm:bg-background-light/80'
      : 'max-sm:bg-background/80';

  const stickyPositionClasses = pinDesktop
    ? clsx(
      // z-20: below sticky page title (z-30), above card overlays (z-10)
      'sticky z-20 -mx-3 px-3 py-2 sm:mx-0 sm:px-0',
      'top-[calc(var(--sticky-page-heading-height,0px)-1px)] sm:top-[calc(var(--app-header-height,4.5625rem)-1px)]',
    )
    : clsx(
      'max-sm:sticky max-sm:z-20 max-sm:-mx-3 max-sm:px-3 max-sm:py-2',
      'max-sm:top-[calc(var(--sticky-page-heading-height,0px)-1px)]',
    );

  const borderClasses = pinDesktop
    ? clsx(
      'border-b transition-[border-color]',
      isStuck ? 'border-border-color' : 'border-transparent',
    )
    : clsx(
      'max-sm:border-b max-sm:transition-[border-color]',
      isStuck ? 'max-sm:border-border-color' : 'max-sm:border-transparent',
    );

  const frostedClasses = pinDesktop
    ? 'bg-background/80 backdrop-blur-sm'
    : clsx('max-sm:backdrop-blur-sm', bgClass);

  const content = as === 'div' ? (
    <div
      className={clsx('min-w-0', className)}
    >
      {children}
    </div>
  ) : (
    <DynamicHeading
      as={as}
      className={clsx('min-w-0 text-xl font-semibold font-heading', className)}
    >
      {children}
    </DynamicHeading>
  );

  const marginClasses = pinDesktop ? 'mb-2' : 'mb-2 sm:mb-4';

  if (accessory) {
    return (
      <div
        ref={rowRef}
        className={clsx(
          stickyPositionClasses,
          frostedClasses,
          borderClasses,
          marginClasses,
          stickyClassName,
          'flex items-center justify-between gap-3',
        )}
      >
        {content}
        <div
          className="shrink-0"
        >
          {accessory}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      className={clsx(
        stickyPositionClasses,
        frostedClasses,
        borderClasses,
        marginClasses,
        stickyClassName,
      )}
    >
      {content}
    </div>
  );
}
