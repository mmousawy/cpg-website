import type { Tables } from '@/database.types';
import type { AlbumWithPhotos } from '@/types/albums';
import { supabase } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';

type AlbumFilter = 'all' | 'personal' | 'shared' | 'event';

async function fetchAlbums(userId: string, filter: AlbumFilter = 'all'): Promise<AlbumWithPhotos[]> {
  let query = supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      is_shared,
      join_policy,
      event_id,
      created_by_system,
      max_photos_per_user,
      created_at,
      user_id,
      photos:album_photos(
        id,
        photo_url,
        photo:photos!album_photos_photo_id_fkey(deleted_at, blurhash)
      ),
      tags:album_tags(tag)
    `)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .limit(100);

  if (filter === 'personal') {
    query = query.is('event_id', null).eq('is_shared', false);
  } else if (filter === 'shared') {
    query = query.is('event_id', null).eq('is_shared', true);
  } else if (filter === 'event') {
    query = query.not('event_id', 'is', null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Failed to fetch albums');
  }

  type AlbumPhotoRow = Pick<Tables<'album_photos'>, 'id' | 'photo_url'>;
  type PhotoRow = Pick<Tables<'photos'>, 'deleted_at' | 'blurhash'>;
  type AlbumPhotoWithPhoto = AlbumPhotoRow & {
    photo: PhotoRow | null;
  };

  type AlbumRow = Pick<
    Tables<'albums'>,
    | 'id'
    | 'title'
    | 'description'
    | 'slug'
    | 'cover_image_url'
    | 'is_public'
    | 'is_shared'
    | 'join_policy'
    | 'event_id'
    | 'created_by_system'
    | 'max_photos_per_user'
    | 'created_at'
    | 'user_id'
  >;
  type AlbumQueryResult = AlbumRow & {
    photos: AlbumPhotoWithPhoto[] | null;
    tags: Array<{ tag: string }> | null;
  };

  // Filter out deleted photos from albums and resolve cover image blurhash
  const albumsWithFilteredPhotos = (data || []).map((album: AlbumQueryResult) => {
    const activePhotos = (album.photos || []).filter((ap) => !ap.photo?.deleted_at);

    // Resolve blurhash for the cover image
    const coverUrl = album.cover_image_url || activePhotos[0]?.photo_url;
    const coverPhoto = coverUrl
      ? activePhotos.find((ap) => ap.photo_url === coverUrl)
      : activePhotos[0];
    const cover_image_blurhash = coverPhoto?.photo?.blurhash || null;

    return {
      ...album,
      photos: activePhotos,
      cover_image_blurhash,
    };
  });

  return albumsWithFilteredPhotos as unknown as AlbumWithPhotos[];
}

export function useAlbums(userId: string | undefined) {
  return useQuery({
    queryKey: ['albums', userId],
    queryFn: () => fetchAlbums(userId!),
    enabled: !!userId,
  });
}

export function usePersonalAlbums(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['albums', userId, 'personal'],
    queryFn: () => fetchAlbums(userId!, 'personal'),
    enabled: !!userId && enabled,
  });
}

export function useYourSharedAlbums(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['albums', userId, 'shared'],
    queryFn: () => fetchAlbums(userId!, 'shared'),
    enabled: !!userId && enabled,
  });
}

export function useOwnEventAlbums(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['albums', userId, 'event'],
    queryFn: () => fetchAlbums(userId!, 'event'),
    enabled: !!userId && enabled,
  });
}

export interface AlbumSectionCounts {
  personal: number;
  shared: number;
  ownEvent: number;
  allEvent: number;
  sharedWithMe: number;
  pendingInvites: number;
}

async function fetchAlbumSectionCounts(userId: string): Promise<AlbumSectionCounts> {
  const [personalRes, sharedRes, ownEventRes, allEventRes, sharedWithMeRes, pendingRes] = await Promise.all([
    supabase
      .from('albums')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .is('event_id', null)
      .eq('is_shared', false),
    supabase
      .from('albums')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .is('event_id', null)
      .eq('is_shared', true),
    supabase
      .from('albums')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .not('event_id', 'is', null),
    supabase
      .from('albums')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .not('event_id', 'is', null),
    supabase
      .from('shared_album_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'accepted'),
    supabase
      .from('shared_album_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('type', 'invite'),
  ]);

  return {
    personal: personalRes.count ?? 0,
    shared: sharedRes.count ?? 0,
    ownEvent: ownEventRes.count ?? 0,
    allEvent: allEventRes.count ?? 0,
    sharedWithMe: sharedWithMeRes.count ?? 0,
    pendingInvites: pendingRes.count ?? 0,
  };
}

export function useAlbumSectionCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ['album-section-counts', userId],
    queryFn: () => fetchAlbumSectionCounts(userId!),
    enabled: !!userId,
  });
}

/**
 * Fetch all event albums (own + others) in a single query.
 */
async function fetchAllEventAlbums(): Promise<AlbumWithPhotos[]> {
  const { data, error } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      is_shared,
      join_policy,
      event_id,
      created_by_system,
      max_photos_per_user,
      created_at,
      user_id,
      photos:album_photos(
        id,
        photo_url,
        photo:photos!album_photos_photo_id_fkey(deleted_at, blurhash)
      ),
      tags:album_tags(tag)
    `)
    .not('event_id', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .limit(100);

  if (error) {
    throw new Error(error.message || 'Failed to fetch event albums');
  }

  type AlbumPhotoRow = Pick<Tables<'album_photos'>, 'id' | 'photo_url'>;
  type PhotoRow = Pick<Tables<'photos'>, 'deleted_at' | 'blurhash'>;
  type AlbumPhotoWithPhoto = AlbumPhotoRow & {
    photo: PhotoRow | null;
  };

  type AlbumRow = Pick<
    Tables<'albums'>,
    | 'id'
    | 'title'
    | 'description'
    | 'slug'
    | 'cover_image_url'
    | 'is_public'
    | 'is_shared'
    | 'join_policy'
    | 'event_id'
    | 'created_by_system'
    | 'max_photos_per_user'
    | 'created_at'
    | 'user_id'
  >;
  type AlbumQueryResult = AlbumRow & {
    photos: AlbumPhotoWithPhoto[] | null;
    tags: Array<{ tag: string }> | null;
  };

  const albumsWithFilteredPhotos = (data || []).map((album: AlbumQueryResult) => {
    const activePhotos = (album.photos || []).filter((ap) => !ap.photo?.deleted_at);

    const coverUrl = album.cover_image_url || activePhotos[0]?.photo_url;
    const coverPhoto = coverUrl
      ? activePhotos.find((ap) => ap.photo_url === coverUrl)
      : activePhotos[0];
    const cover_image_blurhash = coverPhoto?.photo?.blurhash || null;

    return {
      ...album,
      photos: activePhotos,
      cover_image_blurhash,
    };
  });

  return albumsWithFilteredPhotos as unknown as AlbumWithPhotos[];
}

/** Fetch all event albums in a single query */
export function useAllEventAlbums(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['all-event-albums', userId],
    queryFn: () => fetchAllEventAlbums(),
    enabled: !!userId && enabled,
  });
}

async function fetchAlbumBySlug(userId: string, slug: string): Promise<AlbumWithPhotos> {
  const albumSelect = `
    id,
    title,
    description,
    slug,
    cover_image_url,
    is_public,
    is_shared,
    join_policy,
    event_id,
    created_by_system,
    max_photos_per_user,
    created_at,
    user_id,
    photos:album_photos(
      id,
      photo_url,
      photo:photos!album_photos_photo_id_fkey(deleted_at, blurhash)
    ),
    tags:album_tags(tag)
  `;

  // Try fetching album owned by the user first
  let { data, error } = await supabase
    .from('albums')
    .select(albumSelect)
    .eq('user_id', userId)
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  // Fallback: admin may be accessing an event album owned by another admin
  if (!data && !error) {
    const fallback = await supabase
      .from('albums')
      .select(albumSelect)
      .eq('slug', slug)
      .not('event_id', 'is', null)
      .is('deleted_at', null)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    throw new Error(error?.message || 'Failed to fetch album');
  }

  type AlbumPhotoRow = Pick<Tables<'album_photos'>, 'id' | 'photo_url'>;
  type PhotoRow = Pick<Tables<'photos'>, 'deleted_at' | 'blurhash'>;
  type AlbumPhotoWithPhoto = AlbumPhotoRow & {
    photo: PhotoRow | null;
  };

  type AlbumRow = Pick<
    Tables<'albums'>,
    | 'id'
    | 'title'
    | 'description'
    | 'slug'
    | 'cover_image_url'
    | 'is_public'
    | 'is_shared'
    | 'join_policy'
    | 'event_id'
    | 'created_by_system'
    | 'max_photos_per_user'
    | 'created_at'
    | 'user_id'
  >;
  type AlbumQueryResult = AlbumRow & {
    photos: AlbumPhotoWithPhoto[] | null;
    tags: Array<{ tag: string }> | null;
  };

  // Filter out deleted photos from album and resolve cover image blurhash
  const typedData = data as AlbumQueryResult;
  const activePhotos = (typedData.photos || []).filter((ap) => !ap.photo?.deleted_at);

  const coverUrl = typedData.cover_image_url || activePhotos[0]?.photo_url;
  const coverPhoto = coverUrl
    ? activePhotos.find((ap) => ap.photo_url === coverUrl)
    : activePhotos[0];
  const cover_image_blurhash = coverPhoto?.photo?.blurhash || null;

  const albumWithFilteredPhotos = {
    ...typedData,
    photos: activePhotos,
    cover_image_blurhash,
  };

  return albumWithFilteredPhotos as unknown as AlbumWithPhotos;
}

export function useAlbumBySlug(userId: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ['album', userId, slug],
    queryFn: () => fetchAlbumBySlug(userId!, slug!),
    enabled: !!userId && !!slug,
  });
}

/** Album with owner profile, returned by fetchSharedWithMeAlbums */
export type SharedWithMeAlbum = AlbumWithPhotos & {
  owner_profile: {
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

/**
 * Fetch albums where the current user is a member (not the owner).
 * Joins through shared_album_members → albums, then fetches photos separately.
 */
async function fetchSharedWithMeAlbums(userId: string): Promise<SharedWithMeAlbum[]> {
  // Step 1: Get album IDs where the user is a member
  const { data: memberships, error: memberError } = await supabase
    .from('shared_album_members')
    .select('album_id')
    .eq('user_id', userId);

  if (memberError) {
    throw new Error(memberError.message || 'Failed to fetch shared album memberships');
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const albumIds = memberships.map((m) => m.album_id);

  // Step 2: Fetch those albums (excluding ones owned by the user)
  const { data, error } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      is_shared,
      join_policy,
      event_id,
      created_by_system,
      max_photos_per_user,
      created_at,
      user_id,
      owner_profile:profiles!albums_user_id_fkey(nickname, full_name, avatar_url),
      photos:album_photos(
        id,
        photo_url,
        photo:photos!album_photos_photo_id_fkey(deleted_at, blurhash)
      ),
      tags:album_tags(tag)
    `)
    .in('id', albumIds)
    .neq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to fetch shared albums');
  }

  type AlbumPhotoRow = Pick<Tables<'album_photos'>, 'id' | 'photo_url'>;
  type PhotoRow = Pick<Tables<'photos'>, 'deleted_at' | 'blurhash'>;
  type AlbumPhotoWithPhoto = AlbumPhotoRow & {
    photo: PhotoRow | null;
  };

  type OwnerProfile = {
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };

  type AlbumRow = Pick<
    Tables<'albums'>,
    | 'id'
    | 'title'
    | 'description'
    | 'slug'
    | 'cover_image_url'
    | 'is_public'
    | 'is_shared'
    | 'join_policy'
    | 'event_id'
    | 'created_by_system'
    | 'max_photos_per_user'
    | 'created_at'
    | 'user_id'
  >;
  type AlbumQueryResult = AlbumRow & {
    owner_profile: OwnerProfile | null;
    photos: AlbumPhotoWithPhoto[] | null;
    tags: Array<{ tag: string }> | null;
  };

  const albumsWithFilteredPhotos = (data || []).map((album: AlbumQueryResult) => {
    const activePhotos = (album.photos || []).filter((ap) => !ap.photo?.deleted_at);

    const coverUrl = album.cover_image_url || activePhotos[0]?.photo_url;
    const coverPhoto = coverUrl
      ? activePhotos.find((ap) => ap.photo_url === coverUrl)
      : activePhotos[0];
    const cover_image_blurhash = coverPhoto?.photo?.blurhash || null;

    return {
      ...album,
      photos: activePhotos,
      cover_image_blurhash,
    };
  });

  return albumsWithFilteredPhotos as unknown as SharedWithMeAlbum[];
}

export function useSharedWithMeAlbums(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['shared-with-me-albums', userId],
    queryFn: () => fetchSharedWithMeAlbums(userId!),
    enabled: !!userId && enabled,
  });
}

/**
 * Fetch a shared-with-me album by owner nickname + slug.
 * Verifies the current user is a member of the album.
 */
async function fetchSharedAlbumByOwnerAndSlug(
  userId: string,
  ownerNickname: string,
  slug: string,
): Promise<SharedWithMeAlbum> {
  // Step 1: Resolve owner profile ID
  const { data: ownerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', ownerNickname)
    .single();

  if (profileError || !ownerProfile) {
    throw new Error('Album owner not found');
  }

  // Step 2: Fetch the album by owner + slug
  const { data, error } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      is_shared,
      join_policy,
      event_id,
      created_by_system,
      max_photos_per_user,
      created_at,
      user_id,
      owner_profile:profiles!albums_user_id_fkey(nickname, full_name, avatar_url),
      photos:album_photos(
        id,
        photo_url,
        photo:photos!album_photos_photo_id_fkey(deleted_at, blurhash)
      ),
      tags:album_tags(tag)
    `)
    .eq('user_id', ownerProfile.id)
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    throw new Error('Album not found');
  }

  // Step 3: Verify user is a member
  const { data: membership } = await supabase
    .from('shared_album_members')
    .select('id')
    .eq('album_id', data.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    throw new Error('You are not a member of this album');
  }

  type AlbumPhotoRow = Pick<Tables<'album_photos'>, 'id' | 'photo_url'>;
  type PhotoRow = Pick<Tables<'photos'>, 'deleted_at' | 'blurhash'>;
  type AlbumPhotoWithPhoto = AlbumPhotoRow & {
    photo: PhotoRow | null;
  };

  type OwnerProfile = {
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };

  type AlbumQueryResult = typeof data & {
    owner_profile: OwnerProfile | null;
    photos: AlbumPhotoWithPhoto[] | null;
  };

  const album = data as AlbumQueryResult;
  const activePhotos = (album.photos || []).filter((ap) => !ap.photo?.deleted_at);

  const coverUrl = album.cover_image_url || activePhotos[0]?.photo_url;
  const coverPhoto = coverUrl
    ? activePhotos.find((ap) => ap.photo_url === coverUrl)
    : activePhotos[0];
  const cover_image_blurhash = coverPhoto?.photo?.blurhash || null;

  return {
    ...album,
    photos: activePhotos,
    cover_image_blurhash,
  } as unknown as SharedWithMeAlbum;
}

export function useSharedAlbumByOwnerAndSlug(
  userId: string | undefined,
  ownerNickname: string | undefined,
  slug: string | undefined,
) {
  return useQuery({
    queryKey: ['shared-album', ownerNickname, slug, userId],
    queryFn: () => fetchSharedAlbumByOwnerAndSlug(userId!, ownerNickname!, slug!),
    enabled: !!userId && !!ownerNickname && !!slug,
  });
}

/** A pending invite with album + owner info */
export type PendingAlbumInvite = {
  requestId: number;
  albumId: string;
  createdAt: string;
  album: SharedWithMeAlbum;
};

/**
 * Fetch albums where the current user has a pending invite (not yet accepted).
 */
async function fetchPendingInvites(userId: string): Promise<PendingAlbumInvite[]> {
  // Step 1: Get pending invite requests for this user
  const { data: requests, error: reqError } = await supabase
    .from('shared_album_requests')
    .select('id, album_id, created_at')
    .eq('user_id', userId)
    .eq('type', 'invite')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (reqError) {
    throw new Error(reqError.message || 'Failed to fetch pending invites');
  }

  if (!requests || requests.length === 0) {
    return [];
  }

  const albumIds = requests.map((r) => r.album_id);

  // Step 2: Fetch album details
  const { data: albums, error: albumError } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      is_shared,
      join_policy,
      event_id,
      created_by_system,
      max_photos_per_user,
      created_at,
      user_id,
      owner_profile:profiles!albums_user_id_fkey(nickname, full_name, avatar_url),
      photos:album_photos(
        id,
        photo_url,
        photo:photos!album_photos_photo_id_fkey(deleted_at, blurhash)
      ),
      tags:album_tags(tag)
    `)
    .in('id', albumIds)
    .is('deleted_at', null);

  if (albumError) {
    throw new Error(albumError.message || 'Failed to fetch invited albums');
  }

  type AlbumPhotoRow = Pick<Tables<'album_photos'>, 'id' | 'photo_url'>;
  type PhotoRow = Pick<Tables<'photos'>, 'deleted_at' | 'blurhash'>;
  type AlbumPhotoWithPhoto = AlbumPhotoRow & { photo: PhotoRow | null };
  type OwnerProfile = {
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };

  const albumMap = new Map(
    (albums ?? []).map((a) => {
      const rawPhotos = (a.photos ?? []) as unknown as AlbumPhotoWithPhoto[];
      const activePhotos = rawPhotos.filter((p) => !p.photo?.deleted_at);
      const cover_image_blurhash = activePhotos[0]
        ? (activePhotos[0].photo as PhotoRow | null)?.blurhash ?? null
        : null;
      return [
        a.id,
        {
          ...a,
          photos: activePhotos,
          cover_image_blurhash,
          owner_profile: (a as unknown as { owner_profile: OwnerProfile | null }).owner_profile,
        } as unknown as SharedWithMeAlbum,
      ];
    }),
  );

  return requests
    .filter((r) => albumMap.has(r.album_id))
    .map((r) => ({
      requestId: r.id,
      albumId: r.album_id,
      createdAt: r.created_at,
      album: albumMap.get(r.album_id)!,
    }));
}

export function usePendingAlbumInvites(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['pending-album-invites', userId],
    queryFn: () => fetchPendingInvites(userId!),
    enabled: !!userId && enabled,
  });
}
