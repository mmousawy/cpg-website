'use client';

import { usePhotos } from '@/hooks/usePhotos';
import { useAlbumSectionCounts, usePendingAlbumInvites, usePersonalAlbums, useSharedWithMeAlbums, useYourSharedAlbums } from '@/hooks/useAlbums';
import { usePhotoCounts } from '@/hooks/usePhotoCounts';
import { useAuth } from '@/hooks/useAuth';

/**
 * Context provider that prefetches and shares manage section data across all pages.
 * This ensures data is cached and available immediately when navigating between
 * photos and albums pages, eliminating loading jank.
 */
export function ManageDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Prefetch all data using React Query hooks
  // This populates the cache so pages can use cached data immediately
  usePhotoCounts(user?.id);
  useAlbumSectionCounts(user?.id);
  usePersonalAlbums(user?.id);
  useYourSharedAlbums(user?.id);
  useSharedWithMeAlbums(user?.id);
  usePendingAlbumInvites(user?.id);

  // Prefetch all photo filter variants to warm up cache
  usePhotos(user?.id, 'all');
  usePhotos(user?.id, 'public');
  usePhotos(user?.id, 'private');

  return <>
    {children}
  </>;
}
