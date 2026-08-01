import type { AlbumWithPhotos } from '@/types/albums';
import type { AlbumCardVariant } from './AlbumCard';

export type AlbumGridProps = {
  albums: AlbumWithPhotos[]
  isOwner?: boolean
  variant?: AlbumCardVariant
  className?: string
  onAlbumClick?: (album: AlbumWithPhotos) => void
  /** When false, uses server-provided likes_count without client refetch */
  liveLikeCounts?: boolean
  /** When false, disables Next.js viewport prefetch on album links */
  prefetchLinks?: boolean
}
