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

  const typedData = albumPhotosData as AlbumPhotoQueryResult[];
  const activePhotos = typedData.filter((ap) => ap.photo && !ap.photo.deleted_at);

  // Collect unique user_ids to fetch owner profiles (filter null for event albums)
  const userIds = [...new Set(activePhotos.map((ap) => ap.photo!.user_id).filter((id): id is string => id != null))];

  // Fetch profiles for all photo owners in one query
  type OwnerProfile = { id: string; nickname: string | null; avatar_url: string | null; full_name: string | null };
  let profileMap = new Map<string, OwnerProfile>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url, full_name')
      .in('id', userIds);
    if (profiles) {
      profileMap = new Map(profiles.map((p) => [p.id, p]));
    }
  }

  const unifiedPhotos: PhotoWithAlbums[] = activePhotos.map((ap) => {
    const photoData = ap.photo!;
    const tags = (photoData.photo_tags || []).map((t) => ({ tag: t.tag }));
    const ownerProfile = (photoData.user_id ? profileMap.get(photoData.user_id) : null) ?? null;
    const { photo_tags: _, ...cleanPhotoData } = photoData;
    return {
      ...cleanPhotoData,
      title: ap.title || cleanPhotoData.title,
      album_photo_id: ap.id,
      album_sort_order: ap.sort_order ?? undefined,
      tags,
      owner_profile: ownerProfile ? {
        nickname: ownerProfile.nickname,
        avatar_url: ownerProfile.avatar_url,
        full_name: ownerProfile.full_name,
      } : null,
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
