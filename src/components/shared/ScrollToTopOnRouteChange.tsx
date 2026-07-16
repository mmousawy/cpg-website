'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const scrollPositions = new Map<string, number>();

/** Route key pending scroll restore after a history popstate navigation. */
let pendingHistoryRestoreKey: string | null = null;

function getRouteKey() {
  return `${window.location.pathname}${window.location.search}`;
}

function restoreScroll(top: number) {
  window.scrollTo({ top, left: 0, behavior: 'auto' });
}

/**
 * Ensures a fresh page starts at the top on client navigations.
 * Restores saved scroll position on history back/forward.
 * Skips hash URLs so deep links like #comments still work.
 */
export default function ScrollToTopOnRouteChange() {
  const pathname = usePathname();
  const isFirstPathnameEffect = useRef(true);

  useEffect(() => {
    const onPopState = () => {
      // location is already updated when popstate fires
      pendingHistoryRestoreKey = getRouteKey();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentKey = getRouteKey();

    if (isFirstPathnameEffect.current) {
      isFirstPathnameEffect.current = false;
      return;
    }

    if (pendingHistoryRestoreKey === currentKey) {
      pendingHistoryRestoreKey = null;

      const savedTop = scrollPositions.get(currentKey);
      if (savedTop !== undefined) {
        const restore = () => restoreScroll(savedTop);
        // Restore after Next.js layout scroll handlers run.
        requestAnimationFrame(() => {
          restore();
          requestAnimationFrame(restore);
        });
      }

      return;
    }

    pendingHistoryRestoreKey = null;

    if (window.location.hash) return;

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    scrollToTop();
    const rafId = requestAnimationFrame(scrollToTop);

    return () => cancelAnimationFrame(rafId);
  }, [pathname]);

  // Save scroll position when leaving a route, not on every scroll event.
  // Listening to scroll breaks when overlays temporarily change window.scrollY.
  useEffect(() => {
    const routeKey = getRouteKey();

    return () => {
      scrollPositions.set(routeKey, window.scrollY);
    };
  }, [pathname]);

  return null;
}
