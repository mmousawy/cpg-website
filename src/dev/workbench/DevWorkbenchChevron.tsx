'use client';

import clsx from 'clsx';

import ChevronDownSVG from 'public/icons/chevron-down.svg';

import { workbenchTransitionMs } from './motion';

type DevWorkbenchChevronProps = {
  open: boolean;
  className?: string;
  sizeClass?: string;
};

export default function DevWorkbenchChevron({
  open,
  className,
  sizeClass = 'size-3.5',
}: DevWorkbenchChevronProps) {
  const durationMs = workbenchTransitionMs();
  return (
    <ChevronDownSVG
      className={clsx(
        sizeClass,
        'shrink-0 fill-current transition-transform ease-out',
        open ? 'rotate-0' : '-rotate-90',
        className,
      )}
      style={{ transitionDuration: `${durationMs}ms` }}
      aria-hidden
    />
  );
}
