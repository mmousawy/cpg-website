'use client';

import clsx from 'clsx';
import EyeIcon from 'public/icons/eye.svg';

interface ViewCountProps {
  count: number;
  className?: string;
  /** Compact variant for inline display in action bars */
  compact?: boolean;
}

/**
 * Component for displaying view counts with an eye icon.
 * Returns null if count is 0.
 */
export default function ViewCount({ count, className, compact = false }: ViewCountProps) {
  if (count === 0) return null;

  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 text-foreground/60',
        compact ? 'text-xs' : 'text-sm',
        className,
      )}
    >
      <EyeIcon
        className="size-4"
      />
      <span>
        {count.toLocaleString()}
        {!compact && (
          <>
            {' '}
            {count === 1 ? 'view' : 'views'}
          </>
        )}
      </span>
    </div>
  );
}
