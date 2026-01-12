import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import type { PhotoWithAlbums } from '@/types/photos';

type PhotoFilter = 'all' | 'public' | 'private';

async function fetchPhotos(userId: string, filter: PhotoFilter): Promise<PhotoWithAlbums[]> {
  const supabase = createClient();

  let query = supabase
    .from('photos')
    .select(`
      *,
      album_photos!album_photos_photo_id_fkey(
        album:albums(
          id,
          title,
          slug,
          cover_image_url,
          deleted_at,
          profile:profiles(nickname),
          album_photos_active(count)
        )
      )
    `)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (filter === 'public') {
    query = query.eq('is_public', true);
  } else if (filter === 'private') {
    query = query.eq('is_public', false);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Failed to fetch photos');
  }

  const photosWithAlbums = (data || []).map((photo) => {
    const albums = (photo.album_photos || [])
      .map((ap: { album: { id: string; title: string; slug: string; cover_image_url: string | null; deleted_at: string | null; profile: { nickname: string } | null; album_photos_active: { count: number }[] } | null }) => ap.album)
      .filter((a: unknown): a is { id: string; title: string; slug: string; cover_image_url: string | null; deleted_at: string | null; profile: { nickname: string } | null; album_photos_active: { count: number }[] } => a !== null && !(a as any).deleted_at)
      .map((a: { id: string; title: string; slug: string; cover_image_url: string | null; deleted_at: string | null; profile: { nickname: string } | null; album_photos_active: { count: number }[] }) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        cover_image_url: a.cover_image_url,
        profile_nickname: a.profile?.nickname || null,
        photo_count: a.album_photos_active?.[0]?.count ?? 0,
      }));

    const { album_photos: _, ...photoData } = photo;
    return { ...photoData, albums } as PhotoWithAlbums;
  });

  return photosWithAlbums;
}

export function usePhotos(userId: string | undefined, filter: PhotoFilter = 'all') {
  return useQuery({
    queryKey: ['photos', userId, filter],
    queryFn: () => fetchPhotos(userId!, filter),
    enabled: !!userId,
  });
}
