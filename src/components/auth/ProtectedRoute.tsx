'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageContainer from '@/components/layout/PageContainer'

type ProtectedRouteProps = {
  children: React.ReactNode
  /** Require admin access */
  requireAdmin?: boolean
  /** Custom redirect path when not authenticated (default: /login) */
  redirectTo?: string
}

/**
 * Wrapper component for protected routes.
 * Handles authentication checking, loading states, and redirects.
 * 
 * Usage:
 * ```tsx
 * <ProtectedRoute>
 *   <YourPageContent />
 * </ProtectedRoute>
 * 
 * <ProtectedRoute requireAdmin>
 *   <AdminOnlyContent />
 * </ProtectedRoute>
 * ```
 */
export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, isAdmin, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) return

    // Redirect if not authenticated
    if (!user) {
      const currentPath = window.location.pathname
      router.push(`${redirectTo}?redirectTo=${encodeURIComponent(currentPath)}`)
      return
    }

    // Redirect if admin required but user is not admin
    if (requireAdmin && !isAdmin) {
      router.push('/')
    }
  }, [user, isAdmin, isLoading, requireAdmin, redirectTo, router])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <PageContainer className="items-center justify-center">
        <LoadingSpinner />
      </PageContainer>
    )
  }

  // Don't render children until auth check passes
  if (!user) {
    return (
      <PageContainer className="items-center justify-center">
        <LoadingSpinner />
      </PageContainer>
    )
  }

  // Check admin access
  if (requireAdmin && !isAdmin) {
    return (
      <PageContainer className="items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-3xl font-bold">Access denied</h1>
          <p className="text-foreground/70">You don&apos;t have permission to access this page.</p>
        </div>
      </PageContainer>
    )
  }

  return <>{children}</>
}

