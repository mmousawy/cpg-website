'use client';

import type { ReactNode } from 'react';

type DevWorkbenchSidebarProps = {
  ariaLabel: string;
  toolbar?: ReactNode;
  children: ReactNode;
};

export default function DevWorkbenchSidebar({
  ariaLabel,
  toolbar,
  children,
}: DevWorkbenchSidebarProps) {
  return (
    <aside
      className="flex h-full min-h-0 w-72 shrink-0 flex-col overflow-hidden border-r border-border-color bg-background-light"
    >
      {toolbar ? (
        <div
          className="shrink-0 space-y-3 border-b border-border-color p-3"
        >
          {toolbar}
        </div>
      ) : null}
      <nav
        className="min-h-0 flex-1 overflow-y-auto p-2"
        aria-label={ariaLabel}
      >
        {children}
      </nav>
    </aside>
  );
}
