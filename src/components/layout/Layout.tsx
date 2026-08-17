'use client';

import Header from './Header';
import Footer from './Footer';
import SkipToContent from './SkipToContent';

type LayoutProps = {
  children: React.ReactNode
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
    </div>
  );
}
