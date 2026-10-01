'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { scrollToIdWithStickyHeaderOffset } from '@/utils/scrollWithStickyHeader';

/**
 * Intercepts anchor link clicks and scrolls to targets with smooth behavior.
 * Works for same-page hashes (#section) and same-path hashes (/help#section).
 * On load or client navigation, waits until the hashed element is mounted and
 * jumps to it without animation.
 */
export default function SmoothScrollProvider() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === '#') return;

    const id = decodeURIComponent(hash.slice(1));
    if (!id) return;

    scrollToIdWithStickyHeaderOffset(id, 'auto');
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href*="#"]');
      if (!link?.href) return;
      if (link.dataset.smoothScroll === 'self-managed') return;

      try {
        const url = new URL(link.href);
        const hash = url.hash;
        if (!hash || hash === '#') return;

        const id = hash.slice(1);
        const target = document.getElementById(id);
        if (!target) return;

        // Same origin and same path = same-page anchor
        const isSamePage = url.origin === window.location.origin
          && url.pathname === window.location.pathname;

        if (isSamePage) {
          e.preventDefault();
          scrollToIdWithStickyHeaderOffset(id);
          window.history.replaceState(null, '', hash);
          if (!target.hasAttribute('tabindex')) {
            target.tabIndex = -1;
          }
          target.focus({ preventScroll: true });
        }
      } catch {
        // Invalid URL, ignore
      }
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, []);

  return null;
}
