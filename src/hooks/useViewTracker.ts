'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook for tracking views on photos and albums.
 * Fires a fire-and-forget API call on mount to increment view count.
 * Uses keepalive to ensure the request completes even if user navigates away.
 */
export function useViewTracker(type: 'photo' | 'album', id: string) {
  const tracked = useRef(false);

  useEffect(() => {
    // Never track views in development
    if (process.env.NODE_ENV === 'development') return;

    // Only track once per mount, and only if we have a valid ID
    if (tracked.current || !id) return;
    tracked.current = true;

    // Fire-and-forget - don't await, don't block rendering
    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id }),
      keepalive: true, // Ensures completion even if user navigates away
    }).catch(() => {
      // Silently ignore errors - view tracking is non-critical
    });
  }, [type, id]);
}
