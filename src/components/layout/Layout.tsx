'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

// Pages where footer should be hidden (full-height layouts)
const noFooterPaths = ['/account/photos', '/account/albums'];

type LayoutProps = {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const hideFooter = noFooterPaths.some((path) => pathname?.startsWith(path));

  return (
    <div
      className="flex min-h-full flex-col"
    >
      <Header />
      <main
        className="flex grow flex-col"
      >
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
