'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Header from './Header';

const Footer = dynamic(
  () => import('./Footer'),
  { ssr: false },
);

// Pages where footer should be hidden (full-height layouts)
const noFooterPaths = ['/account/photos', '/account/albums'];

type LayoutProps = {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const hideFooter = noFooterPaths.some((path) => pathname?.startsWith(path));
  const isFullHeight = hideFooter;

  // Prevent body scrolling on full-height manage pages and lock viewport height
  useEffect(() => {
    if (isFullHeight) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';
      document.body.style.maxHeight = '100%';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.maxHeight = '';
    };
  }, [isFullHeight]);

  return (
    <div
      className={isFullHeight ? 'flex h-dvh max-h-dvh flex-col overflow-hidden' : 'flex min-h-full flex-col'}
    >
      <Header />
      <main
        className={isFullHeight ? 'flex flex-col flex-1 min-h-0 overflow-hidden' : 'flex grow flex-col'}
      >
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
