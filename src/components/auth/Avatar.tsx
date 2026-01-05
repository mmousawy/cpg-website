'use client'

import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import clsx from 'clsx'

type AvatarProps = {
  // For static mode: provide user data directly
  avatarUrl?: string | null
  fullName?: string | null
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  hoverEffect?: boolean
}

// Size mappings
const SIZE_MAP = {
  xxs: { wrapper: 'w-6 h-6', icon: 'w-3 h-3', fontSize: 12 },
  xs: { wrapper: 'w-8 h-8', icon: 'w-4 h-4', fontSize: 16 },
  sm: { wrapper: 'w-10 h-10', icon: 'w-5 h-5', fontSize: 20 },
  md: { wrapper: 'w-12 h-12', icon: 'w-6 h-6', fontSize: 24 },
  lg: { wrapper: 'w-16 h-16', icon: 'w-8 h-8', fontSize: 32 },
  xl: { wrapper: 'w-24 h-24', icon: 'w-12 h-12', fontSize: 48 },
} as const

export default function Avatar({ avatarUrl: staticAvatarUrl, fullName: staticFullName, size = 'md', className, hoverEffect = false }: AvatarProps) {
  const { user, profile, isLoading } = useAuth()

  // Determine if we're in static mode (props provided) or dynamic mode (using current user)
  const isStaticMode = staticAvatarUrl !== undefined || staticFullName !== undefined

  // Get size config
  const sizeConfig = SIZE_MAP[size]

  // Get avatar data - profile.avatar_url is the single source of truth
  const avatarUrl = isStaticMode ? staticAvatarUrl : profile?.avatar_url
  const fullName = isStaticMode ? staticFullName : profile?.full_name

  // For initials, also check user email as fallback
  const initials = fullName
    ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase()) || null

  // Loading state (dynamic mode only)
  const showLoading = !isStaticMode && isLoading

  // Render content based on state
  const renderContent = () => {
    if (showLoading) {
      return <div className="w-full h-full animate-pulse bg-border-color" />
    }

    if (avatarUrl) {
      return (
        <Image
          src={avatarUrl}
          alt={fullName || 'Profile'}
          sizes='96px'
          width={100}
          height={100}
          loading='lazy'
          quality={95}
          className="object-cover w-full h-full"
        />
      )
    }

    if (initials) {
      return (
        <div 
          className="flex w-full h-full items-center justify-center bg-[#5e9b84] font-bold text-white leading-none"
          style={{ fontSize: sizeConfig.fontSize * 0.875 }}
        >
          {initials}
        </div>
      )
    }

    // Fallback: person icon
    return (
      <div className="flex w-full h-full items-center justify-center bg-[#b9c1ca] dark:bg-[#6e7277]">
        <svg className={clsx("fill-white/90", sizeConfig.icon)} viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className={clsx("relative overflow-hidden rounded-full shrink-0", sizeConfig.wrapper, className)}>
      {hoverEffect && 
        <div className="z-10 rounded-full absolute w-full h-full shadow-[inset_0_0_0_2px_var(--primary),inset_0_0_0_2.5px_#00000030] scale-130 group-focus-visible:scale-100 group-hover:scale-100 transition-all duration-200" />
      }
      {renderContent()}
      {hoverEffect && (
        <div className="z-10 rounded-full absolute w-full h-full border-2 border-primary bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200" />
      )}
    </div>
  )
}
