'use client';

import { useSession } from './useSession';

/**
 * Hook to check if the current user is an admin.
 * Uses server-seeded session data — no additional query needed.
 */
export function useAdmin() {
  const { isAdmin } = useSession();
  return { isAdmin, isLoading: false };
}
