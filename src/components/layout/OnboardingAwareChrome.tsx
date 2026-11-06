'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { isNetworkBlockedPath } from '@/utils/networkBlockedPath';
import { isOnboardingPath } from '@/utils/onboardingPath';

type HideOnOnboardingProps = {
  children: ReactNode;
};

/** Hides site footer on routes that use their own full-screen layout. */
export function HideOnOnboarding({ children }: HideOnOnboardingProps) {
  const pathname = usePathname();
  if (isOnboardingPath(pathname) || isNetworkBlockedPath(pathname)) {
    return null;
  }
  return children;
}
