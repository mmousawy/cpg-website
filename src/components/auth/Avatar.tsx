'use client'

import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import clsx from 'clsx'

type AvatarProps = {
  // For static mode: provide user data directly
  avatarUrl?: string | null
  fullName?: string | null
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  hoverEffect?: boolean
}

export default function Avatar({ avatarUrl: staticAvatarUrl, fullName: staticFullName, size = 'md', className, hoverEffect = false }: AvatarProps) {
  const { user, profile, isLoading } = useAuth()

  // Determine if we're in static mode (props provided) or dynamic mode (using current user)
  const isStaticMode = staticAvatarUrl !== undefined || staticFullName !== undefined

  // Size classes
  const sizeClasses = {
    xxs: 'size-6',
    xs: 'size-8',
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

  // Icon sizes matching avatar sizes
  const iconSizeClasses = {
    xxs: 'size-3',
    xs: 'size-4',
    sm: 'size-5',
    md: 'size-6',
    lg: 'size-8'
  }

  return (
    // Add CSS circle mask to the image
    <div className={clsx("relative overflow-hidden rounded-full", sizeClasses[size], className)}>
      {hoverEffect && 
        <div className="z-10 rounded-full absolute w-full h-full shadow-[inset_0_0_0_2px_var(--primary),inset_0_0_0_2.5px_#00000030] scale-130 group-focus-visible:scale-100 group-hover:scale-100 transition-all duration-200"></div>
      }
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={fullName || 'Profile'}
          // "sizes" and "width" and "height" based on iconSizeClasses[size]
          sizes='64px'
          width={100}
          height={100}
          loading='lazy'
          quality={95}
          className="object-cover w-full h-full transition-all duration-200"
        />
      ) : initials && initials !== '?' ? (
        // Vertical centering for smaller sizes
        <div className="flex size-full items-center justify-center bg-[#5e9b84] text-sm font-bold text-white h-full leading-none" style={{ fontSize: `${(parseInt(iconSizeClasses[size]?.replace('size-', '')) || 12) * 4}px` }}>
          {initials}
        </div>
      ) : (
        <div className="flex size-full items-center justify-center bg-[#5e9b84]">
          <svg className={clsx("fill-white/90", iconSizeClasses[size])} viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      )}
      {/* Add white overlay to show up on hover */}
      {hoverEffect && (
        <div className="z-10 rounded-full absolute w-full h-full border-2 border-primary bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200"></div>
      )}
    </div>
  )
}
