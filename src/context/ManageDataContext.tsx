'use client';

import { useAlbumSectionCounts, usePendingAlbumInvites, usePersonalAlbums, useSharedWithMeAlbums, useYourSharedAlbums } from '@/hooks/useAlbums';
import { useAuth } from '@/hooks/useAuth';
import { useAlbumCount, usePhotoCount } from '@/hooks/usePhotoCounts';

/**
 * Context provider that prefetches manage section data across album pages.
 * Photo listing is loaded on the photos page only (paginated infinite scroll).
 * Tab badge counts are cheap head queries and are prefetched for both tabs.
 */
export function ManageDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  usePhotoCount(user?.id);
  useAlbumCount(user?.id);
  useAlbumSectionCounts(user?.id);
  usePersonalAlbums(user?.id);
  useYourSharedAlbums(user?.id);
  useSharedWithMeAlbums(user?.id);
  usePendingAlbumInvites(user?.id);

  return <>
    {children}
  </>;
}
