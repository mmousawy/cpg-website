'use client'

import { useAuth } from '@/hooks/useAuth'
import AlbumCard, { type AlbumCardVariant } from './AlbumCard'
import type { AlbumWithPhotos } from '@/types/albums'

type AlbumCardWithPreferenceProps = {
  album: AlbumWithPhotos
  isOwner?: boolean
  /** Override the user's preference with a specific variant */
  variant?: AlbumCardVariant
}

/**
 * AlbumCard wrapper that automatically uses the user's album_card_style preference.
 * Falls back to 'large' if no preference is set.
 */
export default function AlbumCardWithPreference({ 
  album, 
  isOwner = false,
  variant 
}: AlbumCardWithPreferenceProps) {
  const { profile } = useAuth()
  
  // Validate that profile preference is a valid variant
  const profileVariant = profile?.album_card_style === 'large' || profile?.album_card_style === 'compact' 
    ? profile.album_card_style 
    : undefined
  
  // Use explicit variant if provided, otherwise use user preference, default to 'large'
  const effectiveVariant: AlbumCardVariant = variant ?? profileVariant ?? 'large'
  
  return (
    <AlbumCard 
      album={album} 
      isOwner={isOwner} 
      variant={effectiveVariant} 
    />
  )
}

