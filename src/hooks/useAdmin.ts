'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from './useAuth'

export function useAdmin() {
  const { user } = useAuth()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      setIsLoading(false)
      return
    }

    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setIsAdmin(data?.is_admin === true)
        setIsLoading(false)
      })
      .catch(() => {
        setIsAdmin(false)
        setIsLoading(false)
      })
  }, [user, supabase])

  return { isAdmin, isLoading }
}

