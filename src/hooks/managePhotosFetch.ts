import type { Tables } from '@/database.types';
import {
  type PhotoFilter,
  type PhotosInfiniteData,
  type PhotosInfinitePage,
  photosQueryKey,
} from '@/hooks/photoQueryCache';
import type { Photo, PhotoWithAlbums } from '@/types/photos';
import { supabase } from '@/utils/supabase/client';
import type { QueryClient } from '@tanstack/react-query';

const PHOTOS_SELECT = `
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
`;

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

export function mapPhotoQueryRow(photo: PhotoQueryResult): PhotoWithAlbums {
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
}

function applyLibraryPhotoFilters<Q extends { eq: Function; is: Function; not: Function }>(
  query: Q,
  userId: string,
  filter: PhotoFilter,
): Q {
  let q = query
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%') as Q;

  if (filter === 'public') {
    q = q.eq('is_public', true) as Q;
  } else if (filter === 'private') {
    q = q.eq('is_public', false) as Q;
  }

  return q;
}

function quotePostgrestValue(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

/** Photos that sort strictly before the target in the manage grid order. */
function buildSortBeforeFilter(sortOrder: number | null, createdAt: string): string {
  const createdAtQuoted = quotePostgrestValue(createdAt);

  if (sortOrder !== null) {
    return `sort_order.lt.${sortOrder},and(sort_order.eq.${sortOrder},created_at.gt.${createdAtQuoted})`;
  }

  return `sort_order.not.is.null,and(sort_order.is.null,created_at.gt.${createdAtQuoted})`;
}

export function isManageLibraryPhoto(photo: Pick<Photo, 'deleted_at' | 'storage_path'>): boolean {
  if (photo.deleted_at != null) return false;
  if (photo.storage_path?.startsWith('events/')) return false;
  return true;
}

const PHOTO_ID_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isManagePhotoId(photoId: string): boolean {
  return PHOTO_ID_UUID_RE.test(photoId);
}

export async function fetchManagePhotoById(
  userId: string,
  photoId: string,
): Promise<PhotoWithAlbums | null> {
  if (!isManagePhotoId(photoId)) {
    return null;
  }

  const { data, error } = await supabase
    .from('photos')
    .select(PHOTOS_SELECT)
    .eq('id', photoId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  if (!data) return null;

  const row = data as PhotoQueryResult;
  if (!isManageLibraryPhoto(row)) return null;

  return mapPhotoQueryRow(row);
}

export async function countLibraryPhotosBefore(
  userId: string,
  filter: PhotoFilter,
  sortOrder: number | null,
  createdAt: string,
): Promise<number> {
  let query = applyLibraryPhotoFilters(supabase.from('photos').select('id', { count: 'exact', head: true }), userId, filter);
  query = query.or(buildSortBeforeFilter(sortOrder, createdAt));

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message || 'Failed to count photos');
  }

  return count ?? 0;
}

export async function fetchPhotosPage(
  userId: string,
  filter: PhotoFilter,
  offset: number,
  pageSize: number,
): Promise<PhotosInfinitePage> {
  const fetchLimit = pageSize + 1;

  let query = applyLibraryPhotoFilters(supabase.from('photos').select(PHOTOS_SELECT), userId, filter)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + fetchLimit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Failed to fetch photos');
  }

  const rows = (data || []) as PhotoQueryResult[];
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  const photosWithAlbums = pageRows.map(mapPhotoQueryRow);

  return { photos: photosWithAlbums, hasMore };
}

function buildInfiniteDataFromFlat(
  flatPhotos: PhotoWithAlbums[],
  pageSize: number,
  lastPageHasMore: boolean,
): PhotosInfiniteData {
  const pages: PhotosInfinitePage[] = [];
  const pageParams: number[] = [];

  for (let offset = 0; offset < flatPhotos.length; offset += pageSize) {
    pages.push({
      photos: flatPhotos.slice(offset, offset + pageSize),
      hasMore: true,
    });
    pageParams.push(offset);
  }

  if (pages.length === 0) {
    return { pages: [{ photos: [], hasMore: lastPageHasMore }], pageParams: [0] };
  }

  const lastIndex = pages.length - 1;
  pages[lastIndex] = {
    ...pages[lastIndex],
    hasMore: lastPageHasMore,
  };

  return { pages, pageParams };
}

export type SeedPhotosThroughIndexResult = {
  data: PhotosInfiniteData;
  found: boolean;
};

/** Load manage-grid pages from offset 0 through the page that contains `photoId`. */
export async function seedPhotosThroughIndex(
  userId: string,
  filter: PhotoFilter,
  pageSize: number,
  photoId: string,
  indexBefore: number,
): Promise<SeedPhotosThroughIndexResult> {
  const minCount = indexBefore + 1;
  const flatPhotos: PhotoWithAlbums[] = [];
  let offset = 0;
  let lastPageHasMore = false;

  while (flatPhotos.length < minCount) {
    const page = await fetchPhotosPage(userId, filter, offset, pageSize);
    flatPhotos.push(...page.photos);
    lastPageHasMore = page.hasMore;
    if (!page.hasMore || page.photos.length === 0) break;
    offset += page.photos.length;
  }

  let found = flatPhotos.some((p) => p.id === photoId);

  if (!found && lastPageHasMore) {
    const page = await fetchPhotosPage(userId, filter, offset, pageSize);
    flatPhotos.push(...page.photos);
    lastPageHasMore = page.hasMore;
    found = flatPhotos.some((p) => p.id === photoId);
  }

  return {
    data: buildInfiniteDataFromFlat(flatPhotos, pageSize, lastPageHasMore),
    found,
  };
}

export function setPhotosInfiniteQueryData(
  queryClient: QueryClient,
  userId: string,
  filter: PhotoFilter,
  pageSize: number,
  data: PhotosInfiniteData,
) {
  queryClient.setQueryData(photosQueryKey(userId, filter, pageSize), data);
}
