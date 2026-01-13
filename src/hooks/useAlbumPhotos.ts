import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase/client';
import type { PhotoWithAlbums } from '@/types/photos';
import type { Photo } from '@/types/photos';

async function fetchAlbumPhotos(albumId: string): Promise<PhotoWithAlbums[]> {

  const { data: albumPhotosData, error } = await supabase
    .from('album_photos')
    .select(`
      id,
      album_id,
      photo_url,
      title,
      sort_order,
      photo:photos!album_photos_photo_id_fkey(*)
    `)
    .eq('album_id', albumId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to fetch album photos');
  }

  if (!albumPhotosData) {
    return [];
  }

  const unifiedPhotos: PhotoWithAlbums[] = albumPhotosData
    .filter((ap) => ap.photo && !(ap.photo as any).deleted_at)
    .map((ap) => {
      const photoData = ap.photo as unknown as Photo;
      return {
        ...photoData,
        title: ap.title || photoData.title,
        album_photo_id: ap.id,
        album_sort_order: ap.sort_order,
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
