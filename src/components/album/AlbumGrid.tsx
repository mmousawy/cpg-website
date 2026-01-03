'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AlbumCard, { type AlbumCardVariant } from './AlbumCard'
import type { AlbumWithPhotos } from '@/types/albums'

const STORAGE_KEY = 'album-card-style'

type AlbumGridProps = {
  albums: AlbumWithPhotos[]
  isOwner?: boolean
  /** Override the user's preference with a specific variant */
  variant?: AlbumCardVariant
  /** Additional className for the grid container */
  className?: string
}

/**
 * Grid of AlbumCards that automatically uses the user's album_card_style preference.
 * Reads from localStorage first, then falls back to profile preference, then 'large'.
 */
export default function AlbumGrid({ 
  albums, 
  isOwner = false,
  variant,
  className = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
}: AlbumGridProps) {
  const { profile } = useAuth()
  const [localPreference, setLocalPreference] = useState<AlbumCardVariant | null>(null)
  
  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'large' || stored === 'compact') {
      setLocalPreference(stored)
    }
  }, [])
  
  // Use explicit variant if provided, otherwise localStorage, then profile, default to 'large'
  const effectiveVariant = variant ?? localPreference ?? profile?.album_card_style ?? 'large'
  
  return (
    <div className={className}>
      {albums.map((album) => (
        <AlbumCard 
          key={album.id}
          album={album} 
          isOwner={isOwner} 
          variant={effectiveVariant} 
        />
      ))}
    </div>
  )
}

