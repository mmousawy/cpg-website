'use client'

import { useAuth } from '@/hooks/useAuth'
import AlbumCard, { type AlbumCardVariant } from './AlbumCard'
import type { AlbumWithPhotos } from '@/types/albums'

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
 * Falls back to 'large' if no preference is set.
 */
export default function AlbumGrid({ 
  albums, 
  isOwner = false,
  variant,
  className = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
}: AlbumGridProps) {
  const { profile } = useAuth()
  
  // Use explicit variant if provided, otherwise use user preference, default to 'large'
  const effectiveVariant = variant ?? profile?.album_card_style ?? 'large'
  
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

