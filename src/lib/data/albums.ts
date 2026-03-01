import type { Tables } from '@/database.types';
import type { AlbumWithPhotos } from '@/types/albums';
import type { Photo } from '@/types/photos';
import { createPublicClient } from '@/utils/supabase/server';
import { cacheLife, cacheTag } from 'next/cache';

/** Resolve blurhash for an album's cover image from its photos */
function resolveCoverBlurhash(
  coverImageUrl: string | null,
  photos: Array<{ photo_url: string | null; photo: { blurhash: string | null } | null }> | null,
): string | null {
  if (!photos || photos.length === 0) return null;
  const coverUrl = coverImageUrl || photos[0]?.photo_url;
  const coverPhoto = coverUrl
    ? photos.find((p) => p.photo_url === coverUrl)
    : photos[0];
  return coverPhoto?.photo?.blurhash || null;
}

/**
 * Get all public album paths (nickname + slug) for static generation
 * Used in generateStaticParams to pre-render album pages
 * No caching needed - only called at build time
 */
export async function getAllAlbumPaths() {
  const supabase = createPublicClient();

  const { data } = await supabase
    .from('albums')
    .select('slug, profile:profiles!albums_user_id_fkey(nickname)')
    .eq('is_public', true)
    .is('deleted_at', null);

  type AlbumRow = Pick<Tables<'albums'>, 'slug'>;
  type ProfileRow = Pick<Tables<'profiles'>, 'nickname'>;
  type AlbumPathQueryResult = AlbumRow & {
    profile: ProfileRow | null;
  };

  return (data || [])
    .filter((a: AlbumPathQueryResult): a is AlbumPathQueryResult & { profile: ProfileRow } => {
      return !!a.slug && !!a.profile?.nickname;
    })
    .map((a) => ({
      nickname: a.profile.nickname,
      albumSlug: a.slug,
    }));
}

/**
 * Get recent public albums for homepage
 * Tagged with 'albums' for granular cache invalidation
 * Note: likes_count is now a column on the albums table (updated via triggers)
 */
export async function getRecentAlbums(limit = 6) {
  'use cache';
  cacheLife('max'); // Cache forever until 'albums' tag is invalidated
  cacheTag('albums');

  const supabase = createPublicClient();

  const { data: albums } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      created_at,
      likes_count,
      profile:profiles!albums_user_id_fkey(full_name, nickname, avatar_url, suspended_at),
      photos:album_photos_active!inner(
        id,
        photo_url,
        photo:photos!album_photos_photo_id_fkey(blurhash)
      ),
      event:events!albums_event_id_fkey(cover_image)
    `)
    .eq('is_public', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Filter out albums with no photos and albums from suspended users
  type AlbumRow = Pick<Tables<'albums'>, 'id' | 'title' | 'description' | 'slug' | 'cover_image_url' | 'is_public' | 'created_at' | 'likes_count'>;
  type ProfileRow = Pick<Tables<'profiles'>, 'full_name' | 'nickname' | 'avatar_url' | 'suspended_at'>;
  // album_photos_active is a view with nullable fields
  type AlbumPhotoActive = Pick<Tables<'album_photos_active'>, 'id' | 'photo_url'> & {
    photo: Pick<Tables<'photos'>, 'blurhash'> | null;
  };
  type AlbumQueryResult = AlbumRow & {
    profile: ProfileRow | null;
    photos: Array<AlbumPhotoActive> | null;
    event: { cover_image: string | null } | null;
  };

  const albumsWithPhotos = (albums || [])
    .filter((album: AlbumQueryResult): album is AlbumQueryResult & { profile: ProfileRow; photos: Array<AlbumPhotoActive> } => {
      return !!album.photos && album.photos.length > 0 && !!album.profile && !album.profile.suspended_at;
    })
    .map((album) => ({
      ...album,
      cover_image_blurhash: resolveCoverBlurhash(album.cover_image_url, album.photos),
      event_cover_image: album.event?.cover_image || null,
    }));

  return albumsWithPhotos as unknown as AlbumWithPhotos[];
}

/**
 * Get all public albums for gallery page
 * Tagged with 'albums' for granular cache invalidation
 * Note: likes_count is now a column on the albums table (updated via triggers)
 */
export async function getPublicAlbums(limit = 50, sortBy: 'recent' | 'popular' = 'recent') {
  'use cache';
  cacheLife('max');
  cacheTag('albums');

  const supabase = createPublicClient();

  const orderColumn = sortBy === 'popular' ? 'view_count' : 'created_at';

  const { data: albums } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      created_at,
      likes_count,
      view_count,
      profile:profiles!albums_user_id_fkey(full_name, nickname, avatar_url, suspended_at),
      photos:album_photos_active!inner(
        id,
        photo_url,
        photo:photos!album_photos_photo_id_fkey(blurhash)
      ),
      event:events!albums_event_id_fkey(cover_image)
    `)
    .eq('is_public', true)
    .is('deleted_at', null)
    .order(orderColumn, { ascending: false })
    .limit(limit);

  // Filter out albums with no photos and albums from suspended users
  type AlbumRow = Pick<Tables<'albums'>, 'id' | 'title' | 'description' | 'slug' | 'cover_image_url' | 'is_public' | 'created_at' | 'likes_count' | 'view_count'>;
  type ProfileRow = Pick<Tables<'profiles'>, 'full_name' | 'nickname' | 'avatar_url' | 'suspended_at'>;
  type AlbumPhotoActive = Pick<Tables<'album_photos_active'>, 'id' | 'photo_url'> & {
    photo: Pick<Tables<'photos'>, 'blurhash'> | null;
  };
  type AlbumQueryResult = AlbumRow & {
    profile: ProfileRow | null;
    photos: Array<AlbumPhotoActive> | null;
    event: { cover_image: string | null } | null;
  };

  const albumsWithPhotos = (albums || [])
    .filter((album: AlbumQueryResult): album is AlbumQueryResult & { profile: ProfileRow; photos: Array<AlbumPhotoActive> } => {
      return !!album.photos && album.photos.length > 0 && !!album.profile && !album.profile.suspended_at;
    })
    .map((album) => ({
      ...album,
      cover_image_blurhash: resolveCoverBlurhash(album.cover_image_url, album.photos),
      event_cover_image: album.event?.cover_image || null,
    }));

  return albumsWithPhotos as unknown as AlbumWithPhotos[];
}

/** Album returned by getAlbumBySlug (uses album_photos_active for photos) */
export type AlbumBySlugResult = Pick<
  Tables<'albums'>,
  | 'id'
  | 'title'
  | 'description'
  | 'slug'
  | 'is_public'
  | 'created_at'
  | 'is_suspended'
  | 'suspension_reason'
  | 'likes_count'
  | 'view_count'
  | 'user_id'
  | 'is_shared'
  | 'join_policy'
  | 'event_id'
  | 'max_photos_per_user'
> & {
  profile: Pick<Tables<'profiles'>, 'full_name' | 'avatar_url' | 'nickname'> | null;
  photos: Array<Pick<Tables<'album_photos_active'>, 'id' | 'photo_url' | 'title' | 'width' | 'height' | 'sort_order'>> | null;
  tags: Array<Pick<Tables<'album_tags'>, 'tag'>> | null;
};

/**
 * Get a single public album by nickname and slug
 * Tagged with 'albums' and 'profile-[nickname]' for granular invalidation
 * Note: likes_count is now a column on the albums table (updated via triggers)
 */
export async function getAlbumBySlug(
  nickname: string,
  albumSlug: string,
): Promise<AlbumBySlugResult | null> {
  'use cache';
  cacheLife('max');
  cacheTag('albums');
  cacheTag(`profile-${nickname}`);
  cacheTag(`album-${nickname}-${albumSlug}`);

  const supabase = createPublicClient();

  // First get the user by nickname
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .maybeSingle();

  if (profileError) {
    console.error(`Error fetching profile for nickname ${nickname}:`, profileError);
    return null;
  }

  if (!profile) {
    console.error(`Profile not found for nickname: ${nickname}`);
    return null;
  }

  // Get album with photos, tags and moderation data
  // Use explicit relationship name to avoid ambiguity with album_likes
  const { data: album, error } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      is_public,
      created_at,
      is_suspended,
      suspension_reason,
      likes_count,
      view_count,
      user_id,
      is_shared,
      join_policy,
      event_id,
      max_photos_per_user,
      profile:profiles!albums_user_id_fkey(full_name, avatar_url, nickname),
      photos:album_photos_active(
        id,
        photo_url,
        title,
        width,
        height,
        sort_order
      ),
      tags:album_tags(tag)
    `)
    .eq('user_id', profile.id)
    .eq('slug', albumSlug)
    .eq('is_public', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching album ${albumSlug} for user ${nickname}:`, error);
    return null;
  }

  if (!album) {
    console.error(`Album not found: ${albumSlug} for user ${nickname}`);
    return null;
  }

  return album;
}

/**
 * Get profiles by user IDs - for photo owner attribution in shared albums
 */
export async function getProfilesByUserIds(
  userIds: string[],
): Promise<Map<string, Pick<Tables<'profiles'>, 'nickname' | 'full_name' | 'avatar_url'>>> {
  'use cache';
  cacheLife('max');
  cacheTag('albums');

  const uniqueIds = [...new Set(userIds.filter((id): id is string => id != null))];
  if (uniqueIds.length === 0) return new Map();

  const supabase = createPublicClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, full_name, avatar_url')
    .in('id', uniqueIds);

  const map = new Map<string, Pick<Tables<'profiles'>, 'nickname' | 'full_name' | 'avatar_url'>>();
  for (const p of profiles ?? []) {
    map.set(p.id, { nickname: p.nickname, full_name: p.full_name, avatar_url: p.avatar_url });
  }
  return map;
}

/**
 * Get photos data for an album by their URLs
 * Tagged with 'albums' for cache invalidation
 * Note: likes_count is now a column on the photos table (updated via triggers)
 */
export async function getPhotosByUrls(photoUrls: string[]) {
  'use cache';
  cacheLife('max');
  cacheTag('albums');

  if (photoUrls.length === 0) {
    return [];
  }

  const supabase = createPublicClient();

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .in('url', photoUrls)
    .is('deleted_at', null);

  if (!photos || photos.length === 0) {
    return [];
  }

  // likes_count is already included in the photo object from the database
  return photos as Photo[];
}

/**
 * Get public albums for a specific user profile
 * Tagged with both 'albums' and 'profile-[nickname]' for granular invalidation
 * Note: likes_count is now a column on the albums table (updated via triggers)
 */
export async function getUserPublicAlbums(userId: string, nickname: string, limit = 50) {
  'use cache';
  cacheLife('max');
  cacheTag('albums');
  cacheTag(`profile-${nickname}`);

  const supabase = createPublicClient();

  const { data: albums } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      created_at,
      likes_count,
      profile:profiles!albums_user_id_fkey(full_name, nickname, avatar_url),
      photos:album_photos_active!inner(
        id,
        photo_url,
        photo:photos!album_photos_photo_id_fkey(blurhash)
      ),
      event:events!albums_event_id_fkey(cover_image)
    `)
    .eq('user_id', userId)
    .eq('is_public', true)
    .is('deleted_at', null)
    .is('event_id', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Filter out albums with no photos
  type AlbumRow = Pick<Tables<'albums'>, 'id' | 'title' | 'description' | 'slug' | 'cover_image_url' | 'is_public' | 'created_at' | 'likes_count'>;
  type ProfileRow = Pick<Tables<'profiles'>, 'full_name' | 'nickname' | 'avatar_url'>;
  type AlbumPhotoActive = Pick<Tables<'album_photos_active'>, 'id' | 'photo_url'> & {
    photo: Pick<Tables<'photos'>, 'blurhash'> | null;
  };
  type AlbumQueryResult = AlbumRow & {
    profile: ProfileRow | null;
    photos: Array<AlbumPhotoActive> | null;
    event: { cover_image: string | null } | null;
  };

  const albumsWithPhotos = (albums || [])
    .filter((album: AlbumQueryResult): album is AlbumQueryResult & { photos: Array<AlbumPhotoActive> } => {
      return !!album.photos && album.photos.length > 0;
    })
    .map((album) => ({
      ...album,
      cover_image_blurhash: resolveCoverBlurhash(album.cover_image_url, album.photos),
      event_cover_image: album.event?.cover_image || null,
    }));

  return albumsWithPhotos as unknown as AlbumWithPhotos[];
}

/**
 * Get event album for an event (auto-created by trigger)
 * Tagged with 'albums' and 'events' for cache invalidation
 */
export async function getEventAlbum(eventId: number) {
  'use cache';
  cacheLife('max');
  cacheTag('albums');
  cacheTag('events');
  cacheTag(`event-album-${eventId}`);

  const supabase = createPublicClient();

  const { data: album, error } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      slug,
      user_id,
      is_shared,
      event_id,
      max_photos_per_user,
      profile:profiles!albums_user_id_fkey(nickname),
      photos:album_photos(
        id,
        photo_url,
        title,
        width,
        height,
        sort_order,
        added_by,
        contributor:profiles!album_photos_added_by_fkey(nickname, full_name, avatar_url),
        photo:photos!album_photos_photo_id_fkey(id, short_id, url, width, height, title, blurhash, user_id, deleted_at)
      )
    `)
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !album) return null;

  // Filter out photos whose underlying photo record is deleted
  const activePhotos = (album.photos || []).filter((p) => !p.photo?.deleted_at);

  return {
    ...album,
    photos: activePhotos,
  };
}

export type EventPhotoPageResult = {
  photo: Photo;
  profile: { id: string; full_name: string | null; nickname: string; avatar_url: string | null };
  currentEvent: { id: number; title: string | null; slug: string; cover_image: string | null };
  albums: Array<{ id: string; title: string; slug: string; cover_image_url: string | null; photo_count: number; profile_nickname: string | null; event_slug?: string | null }>;
  challenges: Array<{ id: string; title: string; slug: string; cover_image_url: string | null }>;
  siblingPhotos: Array<{ shortId: string; url: string; blurhash: string | null; sortOrder: number }>;
};

/**
 * Get a photo within an event context by short_id
 * Verifies the photo is in the event's album, returns sibling photos for filmstrip
 * Tagged with 'albums', 'events' for granular cache invalidation
 */
export async function getEventPhotoByShortId(
  eventSlug: string,
  photoShortId: string,
): Promise<EventPhotoPageResult | null> {
  'use cache';
  cacheLife('max');
  cacheTag('albums');
  cacheTag('events');
  cacheTag(`photo-${photoShortId}`);

  const supabase = createPublicClient();

  // Get event by slug
  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, cover_image')
    .eq('slug', eventSlug)
    .single();

  if (!event) {
    return null;
  }

  cacheTag(`event-album-${event.id}`);

  // Get event album
  const { data: album } = await supabase
    .from('albums')
    .select('id')
    .eq('event_id', event.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!album) {
    return null;
  }

  // Get photo with tags
  const { data: photo } = await supabase
    .from('photos')
    .select('*, tags:photo_tags(tag)')
    .eq('short_id', photoShortId)
    .is('deleted_at', null)
    .single();

  if (!photo) {
    return null;
  }

  // Verify photo exists in event album
  const { data: albumPhoto } = await supabase
    .from('album_photos')
    .select('id')
    .eq('album_id', album.id)
    .eq('photo_id', photo.id)
    .single();

  if (!albumPhoto) {
    return null;
  }

  // Get sibling photos from event album, ordered by sort_order
  const { data: siblingData } = await supabase
    .from('album_photos')
    .select('sort_order, photo:photos!album_photos_photo_id_fkey(short_id, url, blurhash, deleted_at)')
    .eq('album_id', album.id)
    .order('sort_order', { ascending: true });

  type AlbumPhotoRow = {
    sort_order: number | null;
    photo: { short_id: string | null; url: string | null; blurhash: string | null; deleted_at: string | null } | null;
  };

  const siblingPhotos = (siblingData || [])
    .filter((ap: AlbumPhotoRow) => !ap.photo?.deleted_at)
    .map((ap: AlbumPhotoRow, index) => {
      const p = ap.photo;
      if (!p?.short_id || !p?.url) return null;
      return {
        shortId: p.short_id,
        url: p.url,
        blurhash: p.blurhash ?? null,
        sortOrder: index,
      };
    })
    .filter((p): p is { shortId: string; url: string; blurhash: string | null; sortOrder: number } => p !== null);

  // Get photo owner profile
  if (!photo.user_id) {
    return null;
  }

  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .eq('id', photo.user_id)
    .is('suspended_at', null)
    .single();

  if (!ownerProfile?.nickname) {
    return null;
  }

  const profile = {
    id: ownerProfile.id,
    full_name: ownerProfile.full_name,
    nickname: ownerProfile.nickname,
    avatar_url: ownerProfile.avatar_url,
  };

  // Get all albums this photo is in (same pattern as challenges)
  const { data: albumPhotosData } = await supabase
    .from('album_photos')
    .select('album_id, albums(id, title, slug, cover_image_url, deleted_at, album_photos_active(count), profile:profiles!albums_user_id_fkey(nickname), event:events!albums_event_id_fkey(slug, cover_image))')
    .eq('photo_id', photo.id);

  type AlbumPhotoWithAlbum = {
    album_id: string;
    albums: {
      id: string;
      title: string;
      slug: string;
      cover_image_url: string | null;
      deleted_at: string | null;
      album_photos_active: Array<{ count: number }>;
      profile: { nickname: string | null } | null;
      event: { slug: string | null; cover_image: string | null } | null;
    } | null;
  };

  const albums = (albumPhotosData || [])
    .map((ap: AlbumPhotoWithAlbum) => {
      const albumRow = ap.albums;
      if (!albumRow || albumRow.deleted_at) return null;
      return {
        id: albumRow.id,
        title: albumRow.title,
        slug: albumRow.slug,
        cover_image_url: albumRow.cover_image_url || albumRow.event?.cover_image || null,
        photo_count: albumRow.album_photos_active?.[0]?.count ?? 0,
        profile_nickname: albumRow.profile?.nickname || null,
        event_slug: albumRow.event?.slug || null,
      };
    })
    .filter(Boolean) as Array<{ id: string; title: string; slug: string; cover_image_url: string | null; photo_count: number; profile_nickname: string | null; event_slug: string | null }>;

  // Get challenges this photo was accepted in (for "Featured in" section)
  const { data: challengeSubmissions } = await supabase
    .from('challenge_submissions')
    .select('challenge_id, challenges(id, title, slug, cover_image_url)')
    .eq('photo_id', photo.id)
    .eq('status', 'accepted');

  type ChallengeSubmissionWithChallenge = {
    challenge_id: string;
    challenges: { id: string; title: string; slug: string; cover_image_url: string | null } | null;
  };

  const challenges = (challengeSubmissions || [])
    .map((cs: ChallengeSubmissionWithChallenge) => cs.challenges)
    .filter((c): c is { id: string; title: string; slug: string; cover_image_url: string | null } => !!c);

  return {
    photo: photo as Photo,
    profile,
    currentEvent: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      cover_image: event.cover_image,
    },
    albums,
    challenges,
    siblingPhotos,
  };
}

/**
 * Get most viewed albums from the last week
 * Shows albums ordered by view count from the last 7 days
 * Tagged with 'albums' for granular cache invalidation
 * Uses shorter cache time (1 hour) since view counts change frequently
 */
export async function getMostViewedAlbumsLastWeek(limit = 20) {
  'use cache';
  cacheLife({ revalidate: 3600 }); // 1 hour - view counts change frequently
  cacheTag('albums');

  const supabase = createPublicClient();

  // Calculate date 7 days ago
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoISO = oneWeekAgo.toISOString();

  // First, get album IDs with most views in the last week
  const { data: viewCounts, error: viewError } = await supabase
    .from('album_views')
    .select('album_id')
    .gte('viewed_at', oneWeekAgoISO);

  if (viewError) {
    console.error('Error fetching album views:', viewError);
    return [];
  }

  if (!viewCounts || viewCounts.length === 0) {
    // No views in the last week - this is expected if migration just ran
    return [];
  }

  // Count views per album
  const albumViewMap = new Map<string, number>();
  for (const view of viewCounts) {
    const count = albumViewMap.get(view.album_id) || 0;
    albumViewMap.set(view.album_id, count + 1);
  }

  // Sort by view count and get top album IDs
  const topAlbumIds = Array.from(albumViewMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([albumId]) => albumId);

  if (topAlbumIds.length === 0) {
    return [];
  }

  // Fetch the actual albums for these IDs
  const { data: albums } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      created_at,
      likes_count,
      view_count,
      profile:profiles!albums_user_id_fkey(full_name, nickname, avatar_url, suspended_at),
      photos:album_photos_active!inner(
        id,
        photo_url,
        photo:photos!album_photos_photo_id_fkey(blurhash)
      ),
      event:events!albums_event_id_fkey(cover_image)
    `)
    .in('id', topAlbumIds)
    .eq('is_public', true)
    .is('deleted_at', null);

  if (!albums || albums.length === 0) {
    return [];
  }

  // Sort albums by their view count order (maintain the order from topAlbumIds)
  const albumOrderMap = new Map(topAlbumIds.map((id, index) => [id, index]));
  albums.sort((a, b) => {
    const aOrder = albumOrderMap.get(a.id) ?? Infinity;
    const bOrder = albumOrderMap.get(b.id) ?? Infinity;
    return aOrder - bOrder;
  });

  // Filter out albums with no photos and albums from suspended users
  type AlbumRow = Pick<Tables<'albums'>, 'id' | 'title' | 'description' | 'slug' | 'cover_image_url' | 'is_public' | 'created_at' | 'likes_count' | 'view_count'>;
  type ProfileRow = Pick<Tables<'profiles'>, 'full_name' | 'nickname' | 'avatar_url' | 'suspended_at'>;
  type AlbumPhotoActive = Pick<Tables<'album_photos_active'>, 'id' | 'photo_url'> & {
    photo: Pick<Tables<'photos'>, 'blurhash'> | null;
  };
  type AlbumQueryResult = AlbumRow & {
    profile: ProfileRow | null;
    photos: Array<AlbumPhotoActive> | null;
    event: { cover_image: string | null } | null;
  };

  const albumsWithPhotos = (albums || [])
    .filter((album: AlbumQueryResult): album is AlbumQueryResult & { profile: ProfileRow; photos: Array<AlbumPhotoActive> } => {
      return !!album.photos && album.photos.length > 0 && !!album.profile && !album.profile.suspended_at;
    })
    .map((album) => ({
      ...album,
      cover_image_blurhash: resolveCoverBlurhash(album.cover_image_url, album.photos),
      event_cover_image: album.event?.cover_image || null,
    }));

  return albumsWithPhotos as unknown as AlbumWithPhotos[];
}
