import { revalidateAlbum, revalidateAlbumBySlug, revalidateGalleryData } from '@/app/actions/revalidate';
import { supabase } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

async function fetchAlbumPhotoIds(albumId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('album_photos')
    .select('photo_id')
    .eq('album_id', albumId);

  if (error) throw new Error(error.message || 'Failed to fetch album photos');
  return (data ?? []).map((r) => r.photo_id);
}

async function fetchMyPhotoCountInAlbum(
  albumId: string,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('album_photos')
    .select('*', { count: 'exact', head: true })
    .eq('album_id', albumId)
    .eq('added_by', userId);

  if (error) throw new Error(error.message || 'Failed to fetch count');
  return count ?? 0;
}

export function useAlbumPhotoIds(albumId: string | undefined) {
  return useQuery({
    queryKey: ['album-photos', albumId],
    queryFn: () => fetchAlbumPhotoIds(albumId!),
    enabled: !!albumId,
  });
}

export function useMyPhotoCountInAlbum(
  albumId: string | undefined,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ['album-photos-count', albumId, userId],
    queryFn: () => fetchMyPhotoCountInAlbum(albumId!, userId!),
    enabled: !!albumId && !!userId,
  });
}

export function useAddPhotosToSharedAlbum(
  albumId: string | undefined,
  ownerNickname: string | null,
  albumSlug: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoIds: string[]) => {
      if (!albumId) throw new Error('Album ID required');
      const { data, error } = await supabase.rpc('add_photos_to_shared_album', {
        p_album_id: albumId,
        p_photo_ids: photoIds,
      });
      if (error) throw new Error(error.message || 'Failed to add photos');
      return data as number;
    },
    onSuccess: () => {
      if (albumId) {
        queryClient.invalidateQueries({ queryKey: ['album-photos', albumId] });
        queryClient.invalidateQueries({ queryKey: ['album-photos-count', albumId] });
      }
      if (ownerNickname) {
        revalidateAlbumBySlug(ownerNickname, albumSlug);
        revalidateAlbum(ownerNickname, albumSlug);
        revalidateGalleryData();
      }
    },
  });
}
