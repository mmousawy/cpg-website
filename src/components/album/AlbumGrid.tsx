'use client';

import dynamic from 'next/dynamic';
import AlbumGridSkeleton from './AlbumGridSkeleton';
import AlbumGridStatic from './AlbumGridStatic';
import type { AlbumGridProps } from './albumGridTypes';

const AlbumGridWithLiveLikes = dynamic(
  () => import('./AlbumGridWithLiveLikes'),
  {
    ssr: false,
    loading: () => <AlbumGridSkeleton />,
  },
);

export type { AlbumGridProps } from './albumGridTypes';

/**
 * Grid of AlbumCards that automatically uses the user's album_card_style preference.
 * Reads from localStorage first, then falls back to profile preference, then 'large'.
 */
export default function AlbumGrid({
  liveLikeCounts = true,
  ...props
}: AlbumGridProps) {
  if (liveLikeCounts === false) {
    return <AlbumGridStatic
      {...props}
    />;
  }

  return <AlbumGridWithLiveLikes
    {...props}
  />;
}
