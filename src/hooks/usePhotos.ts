import { fetchPhotosPage } from '@/hooks/managePhotosFetch';
import {
  EMPTY_PHOTO_LIBRARY_FILTERS,
  type PhotoLibraryFilters,
} from '@/hooks/photoLibraryFilters';
import {
  getFlatPhotos,
  MANAGE_PHOTOS_PAGE_SIZE_DESKTOP,
  MANAGE_PHOTOS_PAGE_SIZE_MOBILE,
  type PhotosInfiniteData,
  photosQueryKey,
} from '@/hooks/photoQueryCache';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMounted } from '@/hooks/useMounted';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

export { fetchPhotosPage } from '@/hooks/managePhotosFetch';

type UsePhotosOptions = {
  /**
   * When true, request the next page as soon as the previous request finishes
   * until the library is fully loaded.
   */
  loadAll?: boolean;
};

export function usePhotos(
  userId: string | undefined,
  libraryFilters: PhotoLibraryFilters = EMPTY_PHOTO_LIBRARY_FILTERS,
  { loadAll = true }: UsePhotosOptions = {},
) {
  const mounted = useMounted();
  const isMobile = useIsMobile();
  const pageSize = mounted
    ? (isMobile ? MANAGE_PHOTOS_PAGE_SIZE_MOBILE : MANAGE_PHOTOS_PAGE_SIZE_DESKTOP)
    : MANAGE_PHOTOS_PAGE_SIZE_DESKTOP;

  const query = useInfiniteQuery({
    queryKey: photosQueryKey(userId!, pageSize, libraryFilters),
    queryFn: ({ pageParam }) => fetchPhotosPage(userId!, libraryFilters, pageParam, pageSize),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((total, page) => total + page.photos.length, 0);
    },
    enabled: !!userId && mounted,
  });

  const { fetchNextPage, hasNextPage, isFetching, isFetchNextPageError } = query;

  useEffect(() => {
    if (!loadAll || !hasNextPage || isFetching || isFetchNextPageError) return;
    void fetchNextPage();
  }, [loadAll, hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);

  const photos = getFlatPhotos(query.data as PhotosInfiniteData | undefined);

  return {
    ...query,
    photos,
    pageSize,
  };
}
