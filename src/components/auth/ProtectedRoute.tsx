'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import PageLoading from '@/components/shared/PageLoading';
import PageContainer from '@/components/layout/PageContainer';

type ProtectedRouteProps = {
  children: React.ReactNode
  /** Require admin access */
  requireAdmin?: boolean
  /** Custom redirect path when not authenticated (default: /login) */
  redirectTo?: string
  /** Skip the onboarding check (for the onboarding page itself) */
  skipOnboardingCheck?: boolean
}

/**
 * Wrapper component for protected routes.
 * Handles authentication checking, loading states, and redirects.
 * Also redirects users without a nickname to the onboarding page.
 *
 * Usage in layout.tsx:
 * ```tsx
 * import ProtectedRoute from '@/components/auth/ProtectedRoute'
 *
 * export default function AccountLayout({ children }) {
 *   return <ProtectedRoute>{children}</ProtectedRoute>
 * }
 * ```
 */
export default function ProtectedRoute({
  children,
  requireAdmin = false,
  redirectTo = '/login',
  skipOnboardingCheck = false,
}: ProtectedRouteProps) {
  const { user, profile, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      const currentPath = window.location.pathname;
      router.push(`${redirectTo}?redirectTo=${encodeURIComponent(currentPath)}`);
      return;
    }

    // If admin is required, wait for profile to load before checking
    if (requireAdmin && profile === null) {
      return; // Still loading profile
    }

    // Check if user needs to complete onboarding (no nickname set)
    // Skip this check if we're already on the onboarding page or if skipOnboardingCheck is true
    if (!skipOnboardingCheck && profile && !profile.nickname && pathname !== '/onboarding') {
      router.push('/onboarding');
      return;
    }

    if (requireAdmin && !isAdmin) {
      router.push('/');
    }
  }, [user, profile, isAdmin, isLoading, requireAdmin, redirectTo, router, skipOnboardingCheck, pathname]);

  // Show loading while checking auth or redirecting
  if (isLoading || !user) {
    return <PageLoading />;
  }

  // Show loading while profile is loading (required for admin check)
  if (requireAdmin && profile === null) {
    return <PageLoading />;
  }

  // Show loading while redirecting to onboarding
  if (!skipOnboardingCheck && profile && !profile.nickname && pathname !== '/onboarding') {
    return <PageLoading />;
  }

  // Check admin access
  if (requireAdmin && !isAdmin) {
    return (
      <PageContainer>
        <div
          className="flex min-h-[50vh] flex-col items-center justify-center text-center"
        >
          <h1
            className="mb-4 text-3xl font-bold"
          >
            Access denied
          </h1>
          <p
            className="text-foreground/70"
          >
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </PageContainer>
    );
  }

  return <>
    {children}
  </>;
}
