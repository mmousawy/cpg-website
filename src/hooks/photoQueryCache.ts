import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { PhotoWithAlbums } from '@/types/photos';

export type PhotoFilter = 'all' | 'public' | 'private';

export type PhotosInfinitePage = {
  photos: PhotoWithAlbums[];
  hasMore: boolean;
};

export type PhotosInfiniteData = InfiniteData<PhotosInfinitePage, number>;

export const MANAGE_PHOTOS_PAGE_SIZE_DESKTOP = 54;
export const MANAGE_PHOTOS_PAGE_SIZE_MOBILE = 24;

export function photosQueryKey(userId: string, filter: PhotoFilter, pageSize: number) {
  return ['photos', userId, filter, pageSize] as const;
}

export function photosQueryFilterKey(userId: string, filter: PhotoFilter) {
  return ['photos', userId, filter] as const;
}

export function getFlatPhotos(data: PhotosInfiniteData | undefined): PhotoWithAlbums[] {
  return data?.pages.flatMap((page) => page.photos) ?? [];
}

export function getPhotosInfiniteData(
  queryClient: QueryClient,
  userId: string,
  filter: PhotoFilter,
): PhotosInfiniteData | undefined {
  const entries = queryClient.getQueriesData<PhotosInfiniteData>({
    queryKey: photosQueryFilterKey(userId, filter),
  });
  return entries[0]?.[1];
}

export function getFlatPhotosFromCache(
  queryClient: QueryClient,
  userId: string,
  filter: PhotoFilter,
): PhotoWithAlbums[] {
  return getFlatPhotos(getPhotosInfiniteData(queryClient, userId, filter));
}

export function rebuildPagesFromFlat(
  old: PhotosInfiniteData,
  photos: PhotoWithAlbums[],
  pageSize: number,
): PhotosInfiniteData {
  const pages: PhotosInfinitePage[] = [];

  for (let offset = 0; offset < photos.length; offset += pageSize) {
    const pageIndex = Math.floor(offset / pageSize);
    const slice = photos.slice(offset, offset + pageSize);
    const oldPage = old.pages[pageIndex];
    pages.push({
      photos: slice,
      hasMore: oldPage?.hasMore ?? false,
    });
  }

  if (pages.length > 0 && old.pages.length > pages.length) {
    const lastIndex = pages.length - 1;
    pages[lastIndex] = {
      ...pages[lastIndex],
      hasMore: old.pages[lastIndex]?.hasMore ?? false,
    };
  }

  return {
    pages,
    pageParams: old.pageParams.slice(0, pages.length),
  };
}

export function updateAllPhotosQueries(
  queryClient: QueryClient,
  userId: string,
  filter: PhotoFilter,
  updater: (photos: PhotoWithAlbums[]) => PhotoWithAlbums[],
) {
  queryClient.setQueriesData<PhotosInfiniteData>(
    { queryKey: photosQueryFilterKey(userId, filter) },
    (old) => {
      if (!old || old.pages.length === 0) return old;
      const pageSize = old.pages[0].photos.length || MANAGE_PHOTOS_PAGE_SIZE_DESKTOP;
      const updated = updater(getFlatPhotos(old));
      return rebuildPagesFromFlat(old, updated, pageSize);
    },
  );
}

export function setAllPhotosQueriesFromFlat(
  queryClient: QueryClient,
  userId: string,
  filter: PhotoFilter,
  photos: PhotoWithAlbums[],
) {
  queryClient.setQueriesData<PhotosInfiniteData>(
    { queryKey: photosQueryFilterKey(userId, filter) },
    (old) => {
      if (!old || old.pages.length === 0) return old;
      const pageSize = old.pages[0].photos.length || MANAGE_PHOTOS_PAGE_SIZE_DESKTOP;
      return rebuildPagesFromFlat(old, photos, pageSize);
    },
  );
}
