'use client';

import { useLayoutEffect, type ReactNode } from 'react';

/**
 * Playwright sends the e2e header, so the public prerender (test profiles
 * filtered out) is replaced before paint. Production never mounts this.
 */
export function HomeBelowFoldE2ESwap({
  children,
  targetId = 'home-below-fold',
}: {
  children: ReactNode;
  /** Public prerender to hide once the e2e tree is mounted. */
  targetId?: string;
}) {
  useLayoutEffect(() => {
    document.getElementById(targetId)?.setAttribute('hidden', '');
  }, [targetId]);

  return children;
}
