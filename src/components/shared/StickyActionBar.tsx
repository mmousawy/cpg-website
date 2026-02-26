'use client';

import clsx from 'clsx';
import { ReactNode } from 'react';

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
}

export default function StickyActionBar({
  children,
  className,
  position = 'bottom',
  constrainWidth = false,
  variant = 'default',
  sticky = true,
}: StickyActionBarProps) {
  return (
    <div
      className={clsx(
        sticky && 'sticky z-30',
        sticky && (position === 'bottom' ? 'bottom-0' : 'top-0'),
        className,
      )}
    >
      {/* Add shadow at top of bar with div element gradient with 0px at top and 20px at bottom */}
      <div
        className={clsx(
          'absolute left-0 right-0 pointer-events-none',
          variant === 'compact' ? 'h-4' : 'h-6',
          position === 'bottom'
            ? variant === 'compact' ? '-top-4 bg-gradient-to-b from-transparent to-background-light' : '-top-6 bg-gradient-to-b from-transparent to-background'
            : variant === 'compact' ? '-bottom-4 bg-gradient-to-t from-transparent to-background-light' : '-bottom-6 bg-gradient-to-t from-transparent to-background',
        )}
      />
      <div
        className={clsx(
          'border-border-color-strong bg-background-light',
          variant === 'compact' ? 'px-2 py-3' : 'px-4 py-3 md:px-12 md:py-4',
          position === 'bottom' ? 'border-t-[0.0625rem]' : 'border-b-[0.0625rem]',
        )}
      >
        <div
          className={clsx(
            'mx-auto flex items-center justify-between gap-4',
            constrainWidth && 'max-w-screen-md',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
