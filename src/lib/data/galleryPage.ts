import type { AlbumWithPhotos } from '@/types/albums';
import { cacheLife, cacheTag } from 'next/cache';

import { getGalleryHomeData, type StreamPhoto } from './gallery';

export type GalleryPageData = {
  popularTags: Awaited<ReturnType<typeof getGalleryHomeData>>['popularTags'];
  mostViewedPhotos: StreamPhoto[];
  mostViewedAlbums: AlbumWithPhotos[];
  recentPhotos: StreamPhoto[];
  recentAlbums: AlbumWithPhotos[];
};

export async function getGalleryPageData(): Promise<GalleryPageData> {
  'use cache';
  cacheLife('galleryPage');
  cacheTag('gallery-page');

  const data = await getGalleryHomeData();

  return {
    popularTags: data.popularTags,
    mostViewedPhotos: data.mostViewedPhotos,
    mostViewedAlbums: data.mostViewedAlbums,
    recentPhotos: data.photos,
    recentAlbums: data.albums,
  };
}
