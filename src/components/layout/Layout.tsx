import type { ReactNode } from 'react';
import { Suspense } from 'react';

import Footer from './Footer';
import { HideOnOnboarding, OnboardingAwareHeader } from './OnboardingAwareChrome';
import MobileTabBar from './MobileTabBar';
import SkipToContent from './SkipToContent';

type LayoutProps = {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div
      className="app-shell flex min-h-full max-sm:min-h-0 flex-col"
    >
      <SkipToContent />
      <Suspense fallback={null}>
        <OnboardingAwareHeader />
      </Suspense>
      <main
        id="main-content"
        tabIndex={-1}
        className="app-shell-main flex grow flex-col outline-none"
      >
        {children}
      </main>
      <Suspense fallback={null}>
        <HideOnOnboarding>
          <Footer />
        </HideOnOnboarding>
      </Suspense>
      <Suspense fallback={null}>
        <MobileTabBar />
      </Suspense>
    </div>
  );
}
