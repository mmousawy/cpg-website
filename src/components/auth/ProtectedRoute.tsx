'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import PageLoading from '@/components/shared/PageLoading'
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
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, isAdmin, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      const currentPath = window.location.pathname
      router.push(`${redirectTo}?redirectTo=${encodeURIComponent(currentPath)}`)
      return
    }

    if (requireAdmin && !isAdmin) {
      router.push('/')
    }
  }, [user, isAdmin, isLoading, requireAdmin, redirectTo, router])

  // Show loading while checking auth or redirecting
  if (isLoading || !user) {
    return <PageLoading />
  }

  // Check admin access
  if (requireAdmin && !isAdmin) {
    return (
      <PageContainer>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <h1 className="mb-4 text-3xl font-bold">Access denied</h1>
          <p className="text-foreground/70">You don&apos;t have permission to access this page.</p>
        </div>
      </PageContainer>
    )
  }

  return <>{children}</>
}

