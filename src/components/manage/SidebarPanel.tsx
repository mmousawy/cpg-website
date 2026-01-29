'use client';

import StickyActionBar from '@/components/shared/StickyActionBar';
import clsx from 'clsx';
import { ReactNode } from 'react';

interface SidebarPanelProps {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Hide the title (useful when title is shown in parent container) */
  hideTitle?: boolean;
}

/**
 * Unified sidebar panel wrapper for edit sidebars.
 * Provides consistent layout with scrollable content area and sticky footer.
 */
export default function SidebarPanel({
  title,
  children,
  footer,
  className,
  hideTitle = false,
}: SidebarPanelProps) {
  return (
    <div
      className={clsx('flex h-full flex-col', className)}
    >
      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto p-4"
      >
        {title && !hideTitle && (
          <h2
            className="mb-4 text-lg font-semibold"
          >
            {title}
          </h2>
        )}
        {children}
      </div>
      {footer && <StickyActionBar
        variant="compact"
      >
        {footer}
      </StickyActionBar>}
    </div>
  );
}
