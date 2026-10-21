'use client';

import { recordView, type ViewEntityType } from '@/utils/recordView';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Hook for tracking views on photos, albums, and profiles.
 * Fires an API call to increment view count on each page visit.
 *
 * Uses pathname as an effect dependency so that client-side navigations
 * (even back to the same page) trigger a new tracking call. This is
 * necessary because the component may live inside a 'use cache' boundary
 * where React reuses the component instance without remounting.
 */
export function useViewTracker(type: ViewEntityType, id: string) {
  const [viewCount, setViewCount] = useState<number | null>(null);
  const pathname = usePathname();
  const trackedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const trackKey = `${type}:${id}:${pathname}`;
    if (trackedKey.current === trackKey) return;
    trackedKey.current = trackKey;

    recordView(type, id).then((count) => {
      if (count != null) {
        setViewCount(count);
      }
    });

    return () => {
      trackedKey.current = null;
    };
  }, [type, id, pathname]);

  return viewCount;
}
