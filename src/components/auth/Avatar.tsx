'use client'

import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import clsx from 'clsx'

type AvatarProps = {
  // For static mode: provide user data directly
  avatarUrl?: string | null
  fullName?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Avatar({ avatarUrl: staticAvatarUrl, fullName: staticFullName, size = 'md', className }: AvatarProps) {
  const { user, profile, isLoading } = useAuth()

  // Determine if we're in static mode (props provided) or dynamic mode (using current user)
  const isStaticMode = staticAvatarUrl !== undefined || staticFullName !== undefined

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

  // Get avatar data - use profile from context instead of separate fetch
  const avatarUrl = isStaticMode
    ? staticAvatarUrl
    : (profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture)

  const fullName = isStaticMode
    ? staticFullName
    : (profile?.full_name || user?.user_metadata?.full_name)

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
