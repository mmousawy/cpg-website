'use client';

import { usePathname } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import {
  restoreCachedRouteScrollPosition,
  shouldSkipScrollToTopOnRouteChange,
} from '@/utils/routeScrollNavigation';
import { scrollContainerTo } from '@/utils/scrollContainer';

/**
 * Ensures a fresh page starts at the top on client navigations.
 * Skip hash URLs so deep links like #comments still work.
 */
function ScrollToTopOnRouteChangeInner() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash) return;
    if (shouldSkipScrollToTopOnRouteChange()) {
      const restore = () => {
        restoreCachedRouteScrollPosition();
      };
      restore();
      const rafId = requestAnimationFrame(restore);
      return () => cancelAnimationFrame(rafId);
    }

    const scrollToTop = () => {
      scrollContainerTo(0, 'auto');
    };

    // Run immediately and again on the next frame for mobile browser stability.
    scrollToTop();
    const rafId = requestAnimationFrame(scrollToTop);

    return () => cancelAnimationFrame(rafId);
  }, [pathname]);

  return null;
}

export default function ScrollToTopOnRouteChange() {
  return (
    <Suspense fallback={null}>
      <ScrollToTopOnRouteChangeInner />
    </Suspense>
  );
}
