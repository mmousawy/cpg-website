'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Hook for tracking views on photos and albums.
 * Fires an API call to increment view count on each page visit.
 *
 * Uses pathname as an effect dependency so that client-side navigations
 * (even back to the same page) trigger a new tracking call. This is
 * necessary because the component may live inside a 'use cache' boundary
 * where React reuses the component instance without remounting.
 */
export function useViewTracker(type: 'photo' | 'album', id: string) {
  const [viewCount, setViewCount] = useState<number | null>(null);
  const pathname = usePathname();
  const trackedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const trackKey = `${type}:${id}:${pathname}`;
    if (trackedKey.current === trackKey) return;
    trackedKey.current = trackKey;

    const isDev = process.env.NODE_ENV === 'development';

    // In dev, just fetch the current count without incrementing
    if (isDev) {
      const table = type === 'photo' ? 'photos' : 'albums';
      fetch(`/api/views?table=${table}&id=${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.view_count != null) {
            setViewCount(data.view_count);
          }
        })
        .catch(() => {});
    } else {
      fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
        keepalive: true,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.view_count != null) {
            setViewCount(data.view_count);
          }
        })
        .catch(() => {});
    }

    return () => {
      trackedKey.current = null;
    };
  }, [type, id, pathname]);

  return viewCount;
}
