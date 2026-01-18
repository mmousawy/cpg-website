import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase/client';
import type { PhotoWithAlbums } from '@/types/photos';
import type { Photo } from '@/types/photos';
import type { Tables } from '@/database.types';

async function fetchAlbumPhotos(albumId: string): Promise<PhotoWithAlbums[]> {

  const { data: albumPhotosData, error } = await supabase
    .from('album_photos')
    .select(`
      id,
      album_id,
      photo_url,
      title,
      sort_order,
      photo:photos!album_photos_photo_id_fkey(
        *,
        photo_tags(tag)
      )
    `)
    .eq('album_id', albumId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to fetch album photos');
  }

  if (!albumPhotosData) {
    return [];
  }

  type AlbumPhotoRow = Pick<Tables<'album_photos'>, 'id' | 'album_id' | 'photo_url' | 'title' | 'sort_order'>;
  type AlbumPhotoQueryResult = AlbumPhotoRow & {
    photo: (Photo & { photo_tags?: Array<{ tag: string }> }) | null;
  };

  const unifiedPhotos: PhotoWithAlbums[] = (albumPhotosData as AlbumPhotoQueryResult[])
    .filter((ap) => ap.photo && !ap.photo.deleted_at)
    .map((ap) => {
      const photoData = ap.photo!;
      const tags = (photoData.photo_tags || []).map((t) => ({ tag: t.tag }));
      const { photo_tags: _, ...cleanPhotoData } = photoData;
      return {
        ...cleanPhotoData,
        title: ap.title || cleanPhotoData.title,
        album_photo_id: ap.id,
        album_sort_order: ap.sort_order ?? undefined,
        tags,
      };
    });

  return unifiedPhotos;
}

export function useAlbumPhotos(albumId: string | undefined) {
  return useQuery({
    queryKey: ['album-photos', albumId],
    queryFn: () => fetchAlbumPhotos(albumId!),
    enabled: !!albumId,
  });
}
