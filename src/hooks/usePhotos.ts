import type { Tables } from '@/database.types';
import type { Photo, PhotoWithAlbums } from '@/types/photos';
import { supabase } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';

type PhotoFilter = 'all' | 'public' | 'private';

async function fetchPhotos(userId: string, filter: PhotoFilter): Promise<PhotoWithAlbums[]> {

  let query = supabase
    .from('photos')
    .select(`
      *,
      photo_tags(tag),
      album_photos!album_photos_photo_id_fkey(
        album:albums(
          id,
          title,
          slug,
          cover_image_url,
          deleted_at,
          profile:profiles!albums_user_id_fkey(nickname),
          album_photos_active(count),
          event:events!albums_event_id_fkey(cover_image)
        )
      ),
      challenge_submissions!challenge_submissions_photo_id_fkey(
        status,
        challenge:challenges(
          id,
          title,
          slug,
          cover_image_url
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

  type AlbumRow = Pick<Tables<'albums'>, 'id' | 'title' | 'slug' | 'cover_image_url' | 'deleted_at'>;
  type ProfileRow = Pick<Tables<'profiles'>, 'nickname'>;
  type ChallengeRow = Pick<Tables<'challenges'>, 'id' | 'title' | 'slug' | 'cover_image_url'>;
  type AlbumPhotoJoin = {
    album: (AlbumRow & {
      profile: ProfileRow | null;
      album_photos_active: Array<{ count: number }>;
      event: { cover_image: string | null } | null;
    }) | null;
  };
  type ChallengeSubmissionJoin = {
    status: string;
    challenge: ChallengeRow | null;
  };

  type PhotoQueryResult = Photo & {
    album_photos: AlbumPhotoJoin[] | null;
    photo_tags?: Array<{ tag: string }> | null;
    challenge_submissions?: ChallengeSubmissionJoin[] | null;
  };

  const photosWithAlbums = (data || []).map((photo: PhotoQueryResult) => {
    const albums = (photo.album_photos || [])
      .map((ap) => ap.album)
      .filter((a): a is NonNullable<typeof a> => a !== null && !a.deleted_at)
      .map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        cover_image_url: a.cover_image_url || a.event?.cover_image || null,
        profile_nickname: a.profile?.nickname || null,
        photo_count: a.album_photos_active?.[0]?.count ?? 0,
      }));

    const challenges = (photo.challenge_submissions || [])
      .filter((cs) => cs.challenge !== null)
      .map((cs) => ({
        id: cs.challenge!.id,
        title: cs.challenge!.title,
        slug: cs.challenge!.slug,
        cover_image_url: cs.challenge!.cover_image_url,
        status: cs.status as 'accepted' | 'pending' | 'rejected',
      }));

    const tags = (photo.photo_tags || []).map((t: { tag: string }) => ({ tag: t.tag }));

    const { album_photos: _, photo_tags: __, challenge_submissions: ___, ...photoData } = photo;
    return { ...photoData, albums, challenges, tags } as PhotoWithAlbums;
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
