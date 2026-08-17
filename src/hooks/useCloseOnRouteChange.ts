'use client';

import { useLayoutEffect, useRef } from 'react';

import { subscribeRouteChange } from '@/lib/routeChange';

/**
 * Calls `onClose` when the App Router pathname changes while the overlay is open.
 * Listens to a window event from DocumentRouteState so this hook does not call
 * `usePathname()` (which must be inside `<Suspense>` under cacheComponents).
 */
export function useCloseOnRouteChange(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  const openRef = useRef(open);
  onCloseRef.current = onClose;
  openRef.current = open;

  useLayoutEffect(() => {
    return subscribeRouteChange(() => {
      if (openRef.current) onCloseRef.current();
    });
  }, []);
}
