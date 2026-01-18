'use client';

import clsx from 'clsx';
import EyeIcon from 'public/icons/eye.svg';

interface ViewCountProps {
  count: number;
  className?: string;
}

/**
 * Component for displaying view counts with an eye icon.
 * Returns null if count is 0.
 */
export default function ViewCount({ count, className }: ViewCountProps) {
  if (count === 0) return null;

  return (
    <div
      className={clsx('flex items-center gap-1.5 text-sm text-foreground/60', className)}
    >
      <EyeIcon
        className="size-4"
      />
      <span>
        {count.toLocaleString()}
        {' '}
        {count === 1 ? 'view' : 'views'}
      </span>
    </div>
  );
}
