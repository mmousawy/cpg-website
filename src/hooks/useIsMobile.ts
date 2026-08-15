'use client';

import { useSyncExternalStore } from 'react';

const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function subscribe(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

/**
 * Hook to detect mobile viewport (< 768px).
 * Uses useSyncExternalStore so the first client render matches the real viewport
 * (no useEffect delay that would flip pageSize / query keys after mount).
 */
export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => false, // Server: assume desktop
  );
}
