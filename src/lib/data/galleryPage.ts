import type { AlbumWithPhotos } from '@/types/albums';

import { getGalleryHomeData, type StreamPhoto } from './gallery';

export type GalleryPageData = {
  popularTags: Awaited<ReturnType<typeof getGalleryHomeData>>['popularTags'];
  mostViewedPhotos: StreamPhoto[];
  mostViewedAlbums: AlbumWithPhotos[];
  recentPhotos: StreamPhoto[];
  recentAlbums: AlbumWithPhotos[];
};

export async function getGalleryPageData(includeTestContent = false): Promise<GalleryPageData> {
  const data = await getGalleryHomeData(includeTestContent);

  return {
    popularTags: data.popularTags,
    mostViewedPhotos: data.mostViewedPhotos,
    mostViewedAlbums: data.mostViewedAlbums,
    recentPhotos: data.photos,
    recentAlbums: data.albums,
  };
}
