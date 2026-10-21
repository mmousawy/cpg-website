import { fetchPhotosPage } from '@/hooks/managePhotosFetch';
import {
  getFlatPhotos,
  MANAGE_PHOTOS_PAGE_SIZE_DESKTOP,
  MANAGE_PHOTOS_PAGE_SIZE_MOBILE,
  type PhotoFilter,
  type PhotosInfiniteData,
  photosQueryKey,
} from '@/hooks/photoQueryCache';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMounted } from '@/hooks/useMounted';
import { useInfiniteQuery } from '@tanstack/react-query';

export { fetchPhotosPage } from '@/hooks/managePhotosFetch';

export function usePhotos(userId: string | undefined, filter: PhotoFilter = 'all') {
  const mounted = useMounted();
  const isMobile = useIsMobile();
  const pageSize = mounted
    ? (isMobile ? MANAGE_PHOTOS_PAGE_SIZE_MOBILE : MANAGE_PHOTOS_PAGE_SIZE_DESKTOP)
    : MANAGE_PHOTOS_PAGE_SIZE_DESKTOP;

  const query = useInfiniteQuery({
    queryKey: photosQueryKey(userId!, filter, pageSize),
    queryFn: ({ pageParam }) => fetchPhotosPage(userId!, filter, pageParam, pageSize),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((total, page) => total + page.photos.length, 0);
    },
    enabled: !!userId && mounted,
  });

  const photos = getFlatPhotos(query.data as PhotosInfiniteData | undefined);

  return {
    ...query,
    photos,
    pageSize,
  };
}
