'use client';

import type { ReactNode } from 'react';

type DevWorkbenchShellProps = {
  header: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
};

export default function DevWorkbenchShell({
  header,
  sidebar,
  children,
}: DevWorkbenchShellProps) {
  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background"
    >
      {header}
      <div
        className="flex min-h-0 flex-1 overflow-hidden"
      >
        {sidebar}
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
