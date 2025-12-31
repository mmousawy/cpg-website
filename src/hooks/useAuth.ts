'use client'

import { useCallback, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'

export type AuthState = {
  user: User | null
  session: Session | null
  isLoading: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
  })

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    // Get initial session and refresh if needed
    const initializeAuth = async () => {
      try {
        // Get the current session
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('Error getting session:', error)
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
          })
          return
        }

        // Only refresh if we have a session and it expires within 60 seconds
        if (session) {
          const expiresAt = session.expires_at || 0
          const now = Math.floor(Date.now() / 1000)
          const shouldRefresh = expiresAt - now < 60 // Less than 60 seconds until expiry

          if (shouldRefresh) {
            const { data: { session: refreshedSession }, error: refreshError } =
              await supabase.auth.refreshSession()

            if (!mounted) return

            if (refreshError) {
              console.error('Error refreshing session:', refreshError)
            }

            setAuthState({
              user: refreshedSession?.user ?? session.user ?? null,
              session: refreshedSession ?? session,
              isLoading: false,
            })
          } else {
            // Session is still valid, use it as-is
            setAuthState({
              user: session.user,
              session: session,
              isLoading: false,
            })
          }
        } else {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
          })
        }
      } catch (err) {
        if (!mounted) return
        console.error('Unexpected error initializing auth:', err)
        setAuthState({
          user: null,
          session: null,
          isLoading: false,
        })
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      setAuthState({
        user: session?.user ?? null,
        session,
        isLoading: false,
      })

      // Update last logged in when user signs in
      if (session?.user && _event === 'SIGNED_IN') {
        try {
          await supabase
            .from('profiles')
            .update({ last_logged_in: new Date().toISOString() })
            .eq('id', session.user.id)
        } catch {
          // Silently fail if profiles table doesn't exist or column doesn't exist
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }, [])

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth-callback${redirectTo ? `?redirectTo=${redirectTo}` : ''}`,
      },
    })
    return { error }
  }, [])

  const signInWithDiscord = useCallback(async (redirectTo?: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth-callback${redirectTo ? `?redirectTo=${redirectTo}` : ''}`,
      },
    })
    return { error }
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }, [])

  const signUpWithEmail = useCallback(async (email: string, password: string, metadata?: { full_name?: string; nickname?: string }) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth-callback`,
        data: metadata,
      },
    })
    return { error }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { error }
  }, [])

  return {
    ...authState,
    signOut,
    signInWithGoogle,
    signInWithDiscord,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    updatePassword,
  }
}
