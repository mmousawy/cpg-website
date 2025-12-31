'use client'

import { useAuth } from './useAuth'

/**
 * Hook to check if the current user is an admin.
 * Uses the isAdmin value from AuthContext - no additional query needed.
 */
export function useAdmin() {
  const { isAdmin, isLoading } = useAuth()
  return { isAdmin, isLoading }
}
