'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Ensures a fresh page starts at the top on client navigations.
 * Skip hash URLs so deep links like #comments still work.
 */
export default function ScrollToTopOnRouteChange() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash) return;

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    // Run immediately and again on the next frame for mobile browser stability.
    scrollToTop();
    const rafId = requestAnimationFrame(scrollToTop);

    return () => cancelAnimationFrame(rafId);
  }, [pathname]);

  return null;
}
