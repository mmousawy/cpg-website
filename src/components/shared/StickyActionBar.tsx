'use client'

import { ReactNode } from 'react'
import clsx from 'clsx'

type StickyActionBarProps = {
  children: ReactNode
  className?: string
  /** Position of the bar */
  position?: 'top' | 'bottom'
}

export default function StickyActionBar({ 
  children, 
  className,
  position = 'bottom' 
}: StickyActionBarProps) {
  return (
    <div
      className="sticky z-40 bottom-0"
    >
      {/* Add shadow at top of bar with div element gradient with 0px at top and 20px at bottom */}
      <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-background"></div>
      <div className={clsx(
        // Top shadow of a few pixels
        'border-t-[0.0625rem] border-border-color-strong bg-background-light',
        'px-4 py-3 sm:px-6 sm:py-4',
        className
      )}>
        <div className="mx-auto flex max-w-screen-md items-center justify-between gap-4">
          {children}
        </div>
      </div>
    </div>
  )
}

