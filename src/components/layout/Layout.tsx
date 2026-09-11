import type { ReactNode } from 'react';
import { Suspense } from 'react';

import Header from './Header';
import Footer from './Footer';
import MobileTabBar from './MobileTabBar';
import SkipToContent from './SkipToContent';

type LayoutProps = {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div
      className="app-shell flex min-h-full flex-col"
    >
      <SkipToContent />
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className="app-shell-main flex grow flex-col outline-none"
      >
        {children}
      </main>
      <Footer />
      <Suspense fallback={null}>
        <MobileTabBar />
      </Suspense>
    </div>
  );
}
