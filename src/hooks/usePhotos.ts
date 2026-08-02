import type { Tables } from '@/database.types';
import {
  getFlatPhotos,
  MANAGE_PHOTOS_PAGE_SIZE_DESKTOP,
  MANAGE_PHOTOS_PAGE_SIZE_MOBILE,
  type PhotoFilter,
  type PhotosInfiniteData,
  type PhotosInfinitePage,
  photosQueryKey,
} from '@/hooks/photoQueryCache';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMounted } from '@/hooks/useMounted';
import type { Photo, PhotoWithAlbums } from '@/types/photos';
import { supabase } from '@/utils/supabase/client';
import { useInfiniteQuery } from '@tanstack/react-query';

async function fetchPhotosPage(
  userId: string,
  filter: PhotoFilter,
  offset: number,
  pageSize: number,
): Promise<PhotosInfinitePage> {
  const fetchLimit = pageSize + 1;

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
          event:events!albums_event_id_fkey(slug, cover_image)
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
    .range(offset, offset + fetchLimit - 1);

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
      event: { slug: string | null; cover_image: string | null } | null;
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

  const rows = (data || []) as PhotoQueryResult[];
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

  const photosWithAlbums = pageRows.map((photo) => {
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
        event_slug: a.event?.slug || null,
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

  return { photos: photosWithAlbums, hasMore };
}

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
