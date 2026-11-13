'use client';

import AuthenticatedProviders from '@/components/layout/AuthenticatedProviders';
import { AuthStackContext } from '@/context/AuthStackContext';
import { PhotoOverviewProvider } from '@/context/PhotoOverviewContext';

type AppProvidersProps = {
  children: React.ReactNode;
};

/**
 * Always mounts the auth provider stack so session hydration does not
 * remount page content when isLoggedIn flips from false to true.
 */
export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthStackContext.Provider
      value={true}
    >
      <AuthenticatedProviders>
        <PhotoOverviewProvider>
          {children}
        </PhotoOverviewProvider>
      </AuthenticatedProviders>
    </AuthStackContext.Provider>
  );
}
