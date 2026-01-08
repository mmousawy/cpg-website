'use client';

import { useSyncExternalStore } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AlbumCard, { type AlbumCardVariant } from './AlbumCard';
import type { AlbumWithPhotos } from '@/types/albums';

const STORAGE_KEY = 'album-card-style';

// Subscribe to storage events for cross-tab sync
function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getStoredPreference(): AlbumCardVariant | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'large' || stored === 'compact') {
    return stored;
  }
  return null;
}

function getServerSnapshot(): AlbumCardVariant | null {
  return null;
}

type AlbumGridProps = {
  albums: AlbumWithPhotos[]
  isOwner?: boolean
  /** Override the user's preference with a specific variant */
  variant?: AlbumCardVariant
  /** Additional className for the grid container */
  className?: string
  /** If provided, clicking an album will call this instead of navigating */
  onAlbumClick?: (album: AlbumWithPhotos) => void
}

/**
 * Grid of AlbumCards that automatically uses the user's album_card_style preference.
 * Reads from localStorage first, then falls back to profile preference, then 'large'.
 */
export default function AlbumGrid({
  albums,
  isOwner = false,
  variant,
  className = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
  onAlbumClick,
}: AlbumGridProps) {
  const { profile } = useAuth();

  // Read from localStorage using useSyncExternalStore
  const localPreference = useSyncExternalStore(
    subscribeToStorage,
    getStoredPreference,
    getServerSnapshot,
  );

  // Validate that profile preference is a valid variant
  const profileVariant = profile?.album_card_style === 'large' || profile?.album_card_style === 'compact'
    ? profile.album_card_style
    : undefined;

  // Use explicit variant if provided, otherwise localStorage, then profile, default to 'large'
  const effectiveVariant: AlbumCardVariant = variant ?? localPreference ?? profileVariant ?? 'large';

  return (
    <div className={className}>
      {albums.map((album) => (
        <AlbumCard
          key={album.id}
          album={album}
          isOwner={isOwner}
          variant={effectiveVariant}
          onClick={onAlbumClick}
        />
      ))}
    </div>
  );
}
