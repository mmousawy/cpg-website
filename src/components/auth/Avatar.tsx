'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/utils/supabase/client'
import clsx from 'clsx'

type AvatarProps = {
  // For static mode: provide user data directly
  avatarUrl?: string | null
  fullName?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Avatar({ avatarUrl: staticAvatarUrl, fullName: staticFullName, size = 'md', className }: AvatarProps) {
  const { user, isLoading } = useAuth()
  const supabase = createClient()
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null)
  const fetchedUserIdRef = useRef<string | null>(null)

  // Determine if we're in static mode (props provided) or dynamic mode (using current user)
  const isStaticMode = staticAvatarUrl !== undefined || staticFullName !== undefined

  // Fetch custom avatar from profile (only in dynamic mode)
  useEffect(() => {
    if (isStaticMode) return

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
  }, [user, supabase, isStaticMode])

  // Size classes
  const sizeClasses = {
    sm: 'size-10',
    md: 'size-12',
    lg: 'size-16'
  }

  // Loading state (only for dynamic mode)
  if (!isStaticMode && isLoading) {
    return <div className={clsx(sizeClasses[size], "animate-pulse rounded-full bg-border-color", className)} />
  }

  // Get avatar data
  const avatarUrl = isStaticMode 
    ? staticAvatarUrl 
    : (customAvatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture)
  
  const fullName = isStaticMode 
    ? staticFullName 
    : user?.user_metadata?.full_name

  const initials = fullName
    ? fullName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : (!isStaticMode && user?.email?.slice(0, 2).toUpperCase()) || '?'

  return (
    <div className={clsx("relative overflow-hidden rounded-full bg-background", sizeClasses[size], className)}>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={fullName || 'Profile'}
          fill
          className="object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-primary text-sm font-bold text-white">
          {initials}
        </div>
      )}
    </div>
  )
}
