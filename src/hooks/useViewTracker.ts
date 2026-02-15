'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hook for tracking views on photos and albums.
 * Fires an API call on mount to increment view count and returns the updated count.
 * Uses keepalive to ensure the request completes even if user navigates away.
 *
 * @param type - 'photo' or 'album'
 * @param id - The entity ID
 * @param initialCount - The server-rendered view count (used until the API responds)
 * @returns The current view count (updates after tracking completes)
 */
export function useViewTracker(type: 'photo' | 'album', id: string, initialCount: number = 0) {
  const [viewCount, setViewCount] = useState(initialCount);
  const tracked = useRef(false);

  // Sync initial count from server props (handles navigation between pages)
  useEffect(() => {
    setViewCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    // Never track views in development
    if (process.env.NODE_ENV === 'development') return;

    // Only track once per mount, and only if we have a valid ID
    if (tracked.current || !id) return;
    tracked.current = true;

    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id }),
      keepalive: true, // Ensures completion even if user navigates away
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.view_count != null) {
          setViewCount(data.view_count);
        }
      })
      .catch(() => {
        // Silently ignore errors - view tracking is non-critical
      });
  }, [type, id]);

  return viewCount;
}
