'use client';

import { useContext } from 'react';

import AuthenticatedProviders from '@/components/layout/AuthenticatedProviders';
import { AuthStackContext } from '@/context/AuthStackContext';

type AuthRouteProvidersLayoutProps = {
  children: React.ReactNode;
};

export default function AuthRouteProvidersLayout({
  children,
}: AuthRouteProvidersLayoutProps) {
  const authStackMounted = useContext(AuthStackContext);

  if (authStackMounted) {
    return children;
  }

  return (
    <AuthStackContext.Provider
      value={true}
    >
      <AuthenticatedProviders>
        {children}
      </AuthenticatedProviders>
    </AuthStackContext.Provider>
  );
}
