'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import Header from '@/components/layout/Header';
import { isOnboardingPath } from '@/utils/onboardingPath';

type HideOnOnboardingProps = {
  children: ReactNode;
};

/** Hides site chrome (footer, etc.) for the full onboarding wizard. */
export function HideOnOnboarding({ children }: HideOnOnboardingProps) {
  const pathname = usePathname();
  if (isOnboardingPath(pathname)) {
    return null;
  }
  return children;
}

export function OnboardingAwareHeader() {
  const pathname = usePathname();
  if (isOnboardingPath(pathname)) {
    return null;
  }
  return <Header />;
}
