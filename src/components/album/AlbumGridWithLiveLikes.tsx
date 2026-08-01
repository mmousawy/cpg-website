'use client';

import { useBatchAlbumLikeCounts } from '@/hooks/useBatchLikeCounts';
import { useAuth } from '@/hooks/useAuth';
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

type AlbumGridWithLiveLikesProps = Omit<AlbumGridProps, 'liveLikeCounts'>;

export default function AlbumGridWithLiveLikes({
  albums,
  isOwner = false,
  variant,
  className = 'grid gap-2 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(190px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]',
  onAlbumClick,
  prefetchLinks = true,
}: AlbumGridWithLiveLikesProps) {
  const { profile } = useAuth();

  const localPreference = useSyncExternalStore(
    subscribeToStorage,
    getStoredPreference,
    getServerSnapshot,
  );

  const profileVariant = profile?.album_card_style === 'large' || profile?.album_card_style === 'compact'
    ? profile.album_card_style
    : undefined;

  const effectiveVariant: AlbumCardVariant = variant ?? localPreference ?? profileVariant ?? 'large';

  const slugs = albums.map((a) => a.slug).filter((slug): slug is string => !!slug);
  const batchLikesQuery = useBatchAlbumLikeCounts(slugs);
  const batchLikesMap = batchLikesQuery.data || new Map<string, number>();

  return (
    <div
      className={className}
    >
      {albums.map((album) => {
        const likesCount = batchLikesMap.get(album.slug) ?? album.likes_count ?? 0;

        return (
          <AlbumCard
            key={album.id}
            album={album}
            isOwner={isOwner}
            variant={effectiveVariant}
            onClick={onAlbumClick}
            likesCount={likesCount}
            prefetch={prefetchLinks}
          />
        );
      })}
    </div>
  );
}
