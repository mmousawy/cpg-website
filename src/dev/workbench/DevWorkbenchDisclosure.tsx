'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';

import { workbenchTransitionMs } from './motion';

type DevWorkbenchDisclosureProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

/** Height-animated expand/collapse (grid 0fr → 1fr) for workbench sidebars. */
export default function DevWorkbenchDisclosure({
  open,
  children,
  className,
  innerClassName,
}: DevWorkbenchDisclosureProps) {
  const durationMs = workbenchTransitionMs();
  return (
    <div
      className={clsx(
        'grid transition-[grid-template-rows] ease-out',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className,
      )}
      style={{ transitionDuration: `${durationMs}ms` }}
      aria-hidden={!open}
    >
      <div
        className={clsx('min-h-0 overflow-hidden', innerClassName)}
      >
        {children}
      </div>
    </div>
  );
}
