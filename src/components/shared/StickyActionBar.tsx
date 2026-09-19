'use client';

import clsx from 'clsx';
import { ReactNode, useRef } from 'react';

import AnimatedStickyBarSlide from '@/components/layout/AnimatedStickyBarSlide';
import {
  mobileFloatingPillClassName,
  mobileFloatingPillInsetClassName,
  mobileStickyChromeZClassName,
} from '@/components/layout/mobileChrome';
import { useReportMobileStickyChromeHeight } from '@/hooks/useReportMobileStickyChromeHeight';

type StickyActionBarProps = {
  children: ReactNode
  className?: string
  /** Position of the bar */
  position?: 'top' | 'bottom'
  /** Whether to constrain width (for page layouts vs sidebars) */
  constrainWidth?: boolean
  variant?: 'default' | 'compact'
  /** Whether the bar is sticky (set false when stacked inside another sticky container) */
  sticky?: boolean
  /** Reserve scroll padding because later content scrolls under this bar (e.g. comments below) */
  overlaysContent?: boolean
}

export default function StickyActionBar({
  children,
  className,
  position = 'bottom',
  constrainWidth = false,
  variant = 'default',
  sticky = true,
  overlaysContent = false,
}: StickyActionBarProps) {
  const isBottomSticky = sticky && position === 'bottom';
  const rootRef = useRef<HTMLDivElement>(null);
  useReportMobileStickyChromeHeight(rootRef, isBottomSticky, overlaysContent);

  const inner = (
    <>
      <div
        className={clsx(
          'absolute left-0 right-0 pointer-events-none hidden sm:block',
          variant === 'compact' ? 'h-4' : 'h-6',
          position === 'bottom'
            ? variant === 'compact' ? '-top-4 bg-gradient-to-b from-transparent to-background-light' : '-top-6 bg-gradient-to-b from-transparent to-background'
            : variant === 'compact' ? '-bottom-4 bg-gradient-to-t from-transparent to-background-light' : '-bottom-6 bg-gradient-to-t from-transparent to-background',
        )}
      />
      <div
        className={clsx(
          mobileFloatingPillClassName,
          'max-sm:overflow-hidden',
          'bg-background-light bg-no-noise sm:border-border-color-strong',
          variant === 'compact' ? 'px-3 py-2.5' : 'px-3 py-3',
          position === 'bottom' ? 'sm:border-t' : 'sm:border-b',
          'md:px-12 md:py-4',
        )}
      >
        <div
          className={clsx(
            'mx-auto flex items-center justify-between gap-3 sm:gap-4',
            constrainWidth && 'max-w-screen-md',
          )}
        >
          {children}
        </div>
      </div>
    </>
  );

  const rootClassName = clsx(
    'relative',
    sticky && 'sticky z-30',
    mobileStickyChromeZClassName,
    isBottomSticky && 'bottom-0 max-sm:mb-3.5 max-sm:bottom-(--mobile-nav-offset,0px)',
    isBottomSticky && mobileFloatingPillInsetClassName,
    sticky && position === 'top' && 'top-0',
    className,
  );

  if (isBottomSticky) {
    return (
      <AnimatedStickyBarSlide
        open
        innerRef={rootRef}
        className={rootClassName}
      >
        {inner}
      </AnimatedStickyBarSlide>
    );
  }

  return (
    <div
      ref={rootRef}
      className={rootClassName}
    >
      {inner}
    </div>
  );
}
