'use client';

import { useLayoutEffect, type ReactNode } from 'react';

/**
 * Playwright sends the e2e header, so the public prerender (test profiles
 * filtered out) is replaced before paint. Production never mounts this.
 */
export function HomeBelowFoldE2ESwap({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    document.getElementById('home-below-fold')?.setAttribute('hidden', '');
  }, []);

  return children;
}
