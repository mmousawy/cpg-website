'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Intercepts anchor link clicks and scrolls to targets with smooth behavior.
 * Works for same-page hashes (#section) and same-path hashes (/help#section).
 * Also scrolls to hash on initial load / client navigation (e.g. /help#section).
 * scroll-padding-top in globals.css handles header offset.
 */
export default function SmoothScrollProvider() {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll to hash on route change (client navigation to page with hash)
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash) {
      const id = hash.slice(1);
      const target = document.getElementById(id);
      if (target) {
        // Small delay so layout is ready
        requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: 'smooth' });
        });
      }
    }
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href*="#"]');
      if (!link?.href) return;

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
          target.scrollIntoView({ behavior: 'smooth' });
          window.history.replaceState(null, '', hash);
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
