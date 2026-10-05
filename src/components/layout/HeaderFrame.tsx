'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** Measured height of the desktop site header (`sm+`); used by sticky in-page section rows. */
export const APP_HEADER_HEIGHT_VAR = '--app-header-height';

type HeaderFrameProps = {
  children: ReactNode;
  className: string;
};

/**
 * Publishes the header height. Does not read the URL, so it stays in the
 * prerendered shell (unlike `usePathname()`, which is a blocking client hook).
 */
export default function HeaderFrame({ children, className }: HeaderFrameProps) {
  const headerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const syncHeight = () => {
      const height = header.getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        APP_HEADER_HEIGHT_VAR,
        height > 0 ? `${height}px` : '0px',
      );
    };

    syncHeight();
    const resizeObserver = new ResizeObserver(syncHeight);
    resizeObserver.observe(header);
    window.addEventListener('resize', syncHeight, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncHeight);
      document.documentElement.style.setProperty(APP_HEADER_HEIGHT_VAR, '0px');
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className={className}
    >
      {children}
    </header>
  );
}
