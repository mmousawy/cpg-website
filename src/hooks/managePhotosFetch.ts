import type { Tables } from '@/database.types';
import {
  decodeCameraDisplayFilterKey,
  decodeCameraFilterKey,
  EMPTY_PHOTO_LIBRARY_FILTERS,
  escapeIlikePattern,
  isCameraDisplayFilterKey,
  NO_CAMERA_RECORDED,
  NO_LENS_RECORDED,
  NO_TAGS,
  NOT_IN_ANY_ALBUM,
  NOT_IN_ANY_CHALLENGE,
  type PhotoLibraryFilters,
  type PhotoLibraryMetaFilters,
  type PhotoLibrarySort,
  uploadedPresetToIsoMin,
  UNTITLED_PHOTO_TITLE,
} from '@/hooks/photoLibraryFilters';
import { buildCameraDisplayOrFilter } from '@/utils/exif';
import {
  type PhotoFilter,
  type PhotosInfiniteData,
  type PhotosInfinitePage,
  photosQueryKey,
} from '@/hooks/photoQueryCache';
import type { Photo, PhotoWithAlbums } from '@/types/photos';
import { supabase } from '@/utils/supabase/client';
import type { QueryClient } from '@tanstack/react-query';

const ALBUM_EMBED = `
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
`;

function buildPhotosSelect(meta: PhotoLibraryMetaFilters): string {
  const photoTagsJoin = meta.tag && meta.tag !== NO_TAGS ? 'photo_tags!inner' : 'photo_tags';
  const needsAlbumInner = meta.albumId != null && meta.albumId !== NOT_IN_ANY_ALBUM;
  const albumPhotosJoin = needsAlbumInner
    ? 'album_photos!inner'
    : 'album_photos!album_photos_photo_id_fkey';
  const needsChallengeInner =
    meta.challengeId != null && meta.challengeId !== NOT_IN_ANY_CHALLENGE;
  const challengeJoin = needsChallengeInner
    ? 'challenge_submissions!inner'
    : 'challenge_submissions!challenge_submissions_photo_id_fkey';

  return `
  *,
  ${photoTagsJoin}(tag),
  ${albumPhotosJoin}(
    album_id,
    ${ALBUM_EMBED}
  ),
  ${challengeJoin}(
    status,
    challenge_id,
    challenge:challenges(
      id,
      title,
      slug,
      cover_image_url
    )
  )
`;
}

const PHOTOS_SELECT = buildPhotosSelect(EMPTY_PHOTO_LIBRARY_FILTERS.meta);

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

type MetaFilterableQuery = {
  eq: (column: string, value: string | boolean) => MetaFilterableQuery;
  or: (filters: string) => MetaFilterableQuery;
  filter: (column: string, operator: string, value: string) => MetaFilterableQuery;
  ilike: (column: string, pattern: string) => MetaFilterableQuery;
  gte: (column: string, value: string) => MetaFilterableQuery;
  not: (column: string, operator: string, value: string) => MetaFilterableQuery;
  order: (
    column: string,
    options: { ascending: boolean; nullsFirst?: boolean },
  ) => MetaFilterableQuery;
};

async function fetchPhotoIdsWithTags(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('photo_tags')
    .select('photo_id, photos!inner(user_id, deleted_at, storage_path)')
    .eq('photos.user_id', userId)
    .is('photos.deleted_at', null)
    .not('photos.storage_path', 'like', 'events/%');

  if (error) {
    throw new Error(error.message || 'Failed to load tagged photos');
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.photo_id) ids.add(row.photo_id);
  }
  return [...ids];
}

async function fetchPhotoIdsWithChallengeSubmissions(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('challenge_submissions')
    .select('photo_id, photos!inner(user_id, deleted_at, storage_path)')
    .eq('photos.user_id', userId)
    .is('photos.deleted_at', null)
    .not('photos.storage_path', 'like', 'events/%');

  if (error) {
    throw new Error(error.message || 'Failed to load challenge submissions');
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.photo_id) ids.add(row.photo_id);
  }
  return [...ids];
}

async function collectExcludePhotoIdSets(
  userId: string,
  meta: PhotoLibraryMetaFilters,
): Promise<string[][]> {
  const sets: string[][] = [];

  if (meta.albumId === NOT_IN_ANY_ALBUM) {
    const ids = await fetchPhotoIdsInActiveAlbums(userId);
    if (ids.length > 0) sets.push(ids);
  }
  if (meta.tag === NO_TAGS) {
    const ids = await fetchPhotoIdsWithTags(userId);
    if (ids.length > 0) sets.push(ids);
  }
  if (meta.challengeId === NOT_IN_ANY_CHALLENGE) {
    const ids = await fetchPhotoIdsWithChallengeSubmissions(userId);
    if (ids.length > 0) sets.push(ids);
  }

  return sets;
}

async function fetchPhotoIdsInActiveAlbums(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('album_photos')
    .select('photo_id, albums!inner(user_id, deleted_at)')
    .eq('albums.user_id', userId)
    .is('albums.deleted_at', null);

  if (error) {
    throw new Error(error.message || 'Failed to load album membership');
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.photo_id) ids.add(row.photo_id);
  }
  return [...ids];
}

function formatUuidInList(ids: string[]): string {
  return `(${ids.map((id) => `"${id}"`).join(',')})`;
}

const NO_CAMERA_EXIF_OR_FILTER =
  'exif_data.is.null,'
  + 'and(exif_data->>Make.is.null,exif_data->>Model.is.null),'
  + 'and(exif_data->>Make.eq.,exif_data->>Model.eq.),'
  + 'and(exif_data->>Make.eq.,exif_data->>Model.is.null),'
  + 'and(exif_data->>Make.is.null,exif_data->>Model.eq.)';

const NO_LENS_EXIF_OR_FILTER =
  'exif_data.is.null,exif_data->>LensModel.is.null,exif_data->>LensModel.eq.';

function applyPhotoLibraryMetaFilters<Q extends MetaFilterableQuery>(
  query: Q,
  meta: PhotoLibraryMetaFilters,
  excludePhotoIdSets: string[][],
): Q {
  let q = query;

  if (meta.title === UNTITLED_PHOTO_TITLE) {
    q = q.or('title.is.null,title.eq.') as Q;
  } else if (meta.title) {
    const pattern = `%${escapeIlikePattern(meta.title)}%`;
    q = q.ilike('title', pattern) as Q;
  }

  if (meta.cameraKey === NO_CAMERA_RECORDED) {
    q = q.or(NO_CAMERA_EXIF_OR_FILTER) as Q;
  } else if (meta.cameraKey && isCameraDisplayFilterKey(meta.cameraKey)) {
    const displayLabel = decodeCameraDisplayFilterKey(meta.cameraKey);
    if (displayLabel) {
      q = q.or(buildCameraDisplayOrFilter(displayLabel)) as Q;
    }
  } else if (meta.cameraKey) {
    const { make, model } = decodeCameraFilterKey(meta.cameraKey);
    if (make) {
      q = q.filter('exif_data->>Make', 'eq', make) as Q;
    }
    if (model) {
      q = q.filter('exif_data->>Model', 'eq', model) as Q;
    }
  }

  if (meta.lens === NO_LENS_RECORDED) {
    q = q.or(NO_LENS_EXIF_OR_FILTER) as Q;
  } else if (meta.lens) {
    q = q.filter('exif_data->>LensModel', 'eq', meta.lens) as Q;
  }

  if (meta.albumId && meta.albumId !== NOT_IN_ANY_ALBUM) {
    q = q.eq('album_photos.album_id', meta.albumId) as Q;
  }

  for (const ids of excludePhotoIdSets) {
    if (ids.length > 0) {
      q = q.not('id', 'in', formatUuidInList(ids)) as Q;
    }
  }

  if (meta.tag && meta.tag !== NO_TAGS) {
    q = q.eq('photo_tags.tag', meta.tag) as Q;
  }

  if (meta.license) {
    q = q.eq('license', meta.license) as Q;
  }

  if (meta.uploaded) {
    q = q.gte('created_at', uploadedPresetToIsoMin(meta.uploaded)) as Q;
  }

  if (meta.challengeId && meta.challengeId !== NOT_IN_ANY_CHALLENGE) {
    q = q.eq('challenge_submissions.challenge_id', meta.challengeId) as Q;
    if (meta.challengeStatus) {
      q = q.eq('challenge_submissions.status', meta.challengeStatus) as Q;
    }
  }

  return q;
}

function applyPhotoLibrarySort<Q extends MetaFilterableQuery>(query: Q, sort: PhotoLibrarySort): Q {
  switch (sort) {
    case 'uploaded_newest':
      return query.order('created_at', { ascending: false }) as Q;
    case 'uploaded_oldest':
      return query.order('created_at', { ascending: true }) as Q;
    case 'title_asc':
      return query.order('title', { ascending: true, nullsFirst: false }) as Q;
    case 'title_desc':
      return query.order('title', { ascending: false, nullsFirst: false }) as Q;
    case 'manual':
    default:
      return query
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false }) as Q;
  }
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

  const row = data as unknown as PhotoQueryResult;
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
  libraryFilters: PhotoLibraryFilters,
  offset: number,
  pageSize: number,
): Promise<PhotosInfinitePage> {
  const { visibility: filter, meta, sort } = libraryFilters;
  const fetchLimit = pageSize + 1;
  const select = buildPhotosSelect(meta);

  const excludePhotoIdSets = await collectExcludePhotoIdSets(userId, meta);

  let query = applyLibraryPhotoFilters(
    supabase.from('photos').select(select as typeof PHOTOS_SELECT),
    userId,
    filter,
  );
  query = applyPhotoLibraryMetaFilters(
    query as MetaFilterableQuery,
    meta,
    excludePhotoIdSets,
  ) as typeof query;
  query = applyPhotoLibrarySort(query as MetaFilterableQuery, sort) as typeof query;
  query = query.range(offset, offset + fetchLimit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Failed to fetch photos');
  }

  const rows = (data || []) as unknown as PhotoQueryResult[];
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
  libraryFilters: PhotoLibraryFilters,
  pageSize: number,
  photoId: string,
  indexBefore: number,
): Promise<SeedPhotosThroughIndexResult> {
  const minCount = indexBefore + 1;
  const flatPhotos: PhotoWithAlbums[] = [];
  let offset = 0;
  let lastPageHasMore = false;

  while (flatPhotos.length < minCount) {
    const page = await fetchPhotosPage(userId, libraryFilters, offset, pageSize);
    flatPhotos.push(...page.photos);
    lastPageHasMore = page.hasMore;
    if (!page.hasMore || page.photos.length === 0) break;
    offset += page.photos.length;
  }

  let found = flatPhotos.some((p) => p.id === photoId);

  if (!found && lastPageHasMore) {
    const page = await fetchPhotosPage(userId, libraryFilters, offset, pageSize);
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
  libraryFilters: PhotoLibraryFilters,
  pageSize: number,
  data: PhotosInfiniteData,
) {
  queryClient.setQueryData(photosQueryKey(userId, pageSize, libraryFilters), data);
}
