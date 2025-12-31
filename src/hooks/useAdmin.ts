'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from './useAuth'

export function useAdmin() {
  const { user, isLoading: authLoading } = useAuth()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // If auth is still loading, keep checking state true
    if (authLoading) {
      setIsChecking(true)
      return
    }

    // If no user, we're done checking
    if (!user) {
      setIsAdmin(false)
      setIsChecking(false)
      return
    }

    const checkAdmin = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        setIsAdmin(data?.is_admin === true)
      } catch {
        setIsAdmin(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkAdmin()
  }, [user, authLoading, supabase])

  // isLoading should be true if either auth is loading OR we're checking admin status
  return { isAdmin, isLoading: authLoading || isChecking }
}
