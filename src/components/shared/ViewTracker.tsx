'use client';

import { useViewTracker } from '@/hooks/useViewTracker';
import ViewCount from '@/components/shared/ViewCount';

interface ViewTrackerProps {
  type: 'photo' | 'album';
  id: string;
  /** Initial view count from the server. When provided, renders a live ViewCount. */
  initialCount?: number;
  /** Whether to use compact display (passed to ViewCount) */
  compact?: boolean;
  /** Additional className for the ViewCount wrapper */
  className?: string;
}

/**
 * Client component that tracks views for photos and albums.
 *
 * When `initialCount` is provided, it also renders a live-updating ViewCount
 * that shows the server-rendered count immediately, then updates to the real
 * count after the view tracking API responds.
 *
 * When `initialCount` is omitted, it renders nothing (backward-compatible).
 */
export default function ViewTracker({ type, id, initialCount, compact, className }: ViewTrackerProps) {
  const viewCount = useViewTracker(type, id, initialCount);

  // If no initial count provided, just track silently (backward-compatible)
  if (initialCount === undefined) {
    return null;
  }

  // Render live view count
  return (
    <ViewCount
      count={viewCount}
      compact={compact}
      className={className}
    />
  );
}
