'use client';

import type { AlbumWithPhotos } from '@/types/albums';
import { useSyncExternalStore } from 'react';
import AlbumCard, { type AlbumCardVariant } from './AlbumCard';
import type { AlbumGridProps } from './albumGridTypes';

const STORAGE_KEY = 'album-card-style';

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

type AlbumGridStaticProps = Omit<AlbumGridProps, 'liveLikeCounts'>;

export default function AlbumGridStatic({
  albums,
  isOwner = false,
  variant,
  className = 'grid gap-2 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(190px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]',
  onAlbumClick,
  prefetchLinks = true,
}: AlbumGridStaticProps) {
  const localPreference = useSyncExternalStore(
    subscribeToStorage,
    getStoredPreference,
    getServerSnapshot,
  );

  const effectiveVariant: AlbumCardVariant = variant ?? localPreference ?? 'large';

  return (
    <div
      className={className}
    >
      {albums.map((album) => (
        <AlbumCard
          key={album.id}
          album={album}
          isOwner={isOwner}
          variant={effectiveVariant}
          onClick={onAlbumClick}
          likesCount={album.likes_count ?? 0}
          prefetch={prefetchLinks}
        />
      ))}
    </div>
  );
}
