'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/utils/supabase/client'

export default function Avatar() {
  const { user, isLoading } = useAuth()
  const supabase = createClient()
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null)
  const fetchedUserIdRef = useRef<string | null>(null)

  // Fetch custom avatar from profile
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) {
        setCustomAvatarUrl(null)
        return
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single()

        if (data?.avatar_url) {
          setCustomAvatarUrl(data.avatar_url)
        } else {
          setCustomAvatarUrl(null)
        }
      } catch {
        setCustomAvatarUrl(null)
      }
    }

    if (user && user.id !== fetchedUserIdRef.current) {
      fetchedUserIdRef.current = user.id
      fetchAvatar()
    } else if (!user) {
      fetchedUserIdRef.current = null
      setCustomAvatarUrl(null)
    }

    const handleAvatarUpdate = () => {
      fetchAvatar()
    }

    window.addEventListener('avatarUpdated', handleAvatarUpdate)
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate)
  }, [user, supabase])

  if (isLoading) {
    return <div className="h-10 w-10 animate-pulse rounded-full bg-border-color" />
  }

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || null

  const avatarUrl = customAvatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture

  return (
    <>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt="Profile"
          className="h-full w-full object-cover"
        />
      ) : initials ? (
        <span className="bg-primary text-sm font-bold text-white flex h-full w-full items-center justify-center">
          {initials}
        </span>
      ) : (
        <svg className="h-6 w-6 text-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )}
    </>
  )
}
