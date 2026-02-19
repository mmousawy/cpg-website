'use client';

import { useViewTracker } from '@/hooks/useViewTracker';
import clsx from 'clsx';
import EyeIcon from 'public/icons/eye.svg';

interface ViewTrackerProps {
  type: 'photo' | 'album';
  id: string;
  /** Whether to use compact display */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Client component that tracks views and displays a fresh count.
 * Shows the eye icon immediately; the number appears once the API responds.
 */
export default function ViewTracker({ type, id, compact = false, className }: ViewTrackerProps) {
  const viewCount = useViewTracker(type, id);

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
      {viewCount != null && viewCount > 0 && (
        <span>
          {viewCount.toLocaleString()}
          {!compact && (
            <>
              {' '}
              {viewCount === 1 ? 'view' : 'views'}
            </>
          )}
        </span>
      )}
    </div>
  );
}
