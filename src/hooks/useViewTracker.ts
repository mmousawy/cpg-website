'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hook for tracking views on photos and albums.
 * Fires an API call to increment view count on each unique visit.
 *
 * Tracks by entity key (type + id) and resets on cleanup (unmount or dep change),
 * so navigating to a different entity or re-mounting the component will re-track.
 * Should be rendered outside 'use cache' boundaries to ensure it runs on every navigation.
 */
export function useViewTracker(type: 'photo' | 'album', id: string, initialCount: number = 0) {
  const [viewCount, setViewCount] = useState(initialCount);
  const trackedKey = useRef<string | null>(null);

  useEffect(() => {
    setViewCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;
    if (!id) return;

    const entityKey = `${type}:${id}`;

    function trackView() {
      if (trackedKey.current === entityKey) return;
      trackedKey.current = entityKey;

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

    trackView();

    return () => {
      // Reset on unmount/dep change so re-mounting or navigating
      // to a different entity (or back to this one) will re-track.
      trackedKey.current = null;
    };
  }, [type, id]);

  return viewCount;
}
