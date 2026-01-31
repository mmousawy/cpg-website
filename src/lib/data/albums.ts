import type { AlbumWithPhotos } from '@/types/albums';
import type { Photo } from '@/types/photos';
import type { AlbumWithPhotosAndProfile } from '@/types/supabase-queries';
import type { Tables } from '@/database.types';
import { createPublicClient } from '@/utils/supabase/server';
import { cacheLife, cacheTag } from 'next/cache';

/**
 * Get all public album paths (nickname + slug) for static generation
 * Used in generateStaticParams to pre-render album pages
 * No caching needed - only called at build time
 */
export async function getAllAlbumPaths() {
  const supabase = createPublicClient();

  const { data } = await supabase
    .from('albums')
    .select('slug, profile:profiles!albums_user_id_fkey!inner(nickname)')
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
        photo_url
      )
    `)
    .eq('is_public', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Filter out albums with no photos and albums from suspended users
  type AlbumRow = Pick<Tables<'albums'>, 'id' | 'title' | 'description' | 'slug' | 'cover_image_url' | 'is_public' | 'created_at' | 'likes_count'>;
  type ProfileRow = Pick<Tables<'profiles'>, 'full_name' | 'nickname' | 'avatar_url' | 'suspended_at'>;
  // album_photos_active is a view with nullable fields
  type AlbumPhotoActive = Pick<Tables<'album_photos_active'>, 'id' | 'photo_url'>;
  type AlbumQueryResult = AlbumRow & {
    profile: ProfileRow | null;
    photos: Array<AlbumPhotoActive> | null;
  };

  const albumsWithPhotos = (albums || [])
    .filter((album: AlbumQueryResult): album is AlbumQueryResult & { profile: ProfileRow; photos: Array<AlbumPhotoActive> } => {
      return !!album.photos && album.photos.length > 0 && !!album.profile && !album.profile.suspended_at;
    });

  return albumsWithPhotos as AlbumWithPhotos[];
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
        photo_url
      )
    `)
    .eq('is_public', true)
    .is('deleted_at', null)
    .order(orderColumn, { ascending: false })
    .limit(limit);

  // Filter out albums with no photos and albums from suspended users
  type AlbumRow = Pick<Tables<'albums'>, 'id' | 'title' | 'description' | 'slug' | 'cover_image_url' | 'is_public' | 'created_at' | 'likes_count' | 'view_count'>;
  type ProfileRow = Pick<Tables<'profiles'>, 'full_name' | 'nickname' | 'avatar_url' | 'suspended_at'>;
  type AlbumPhotoActive = Pick<Tables<'album_photos_active'>, 'id' | 'photo_url'>;
  type AlbumQueryResult = AlbumRow & {
    profile: ProfileRow | null;
    photos: Array<AlbumPhotoActive> | null;
  };

  const albumsWithPhotos = (albums || [])
    .filter((album: AlbumQueryResult): album is AlbumQueryResult & { profile: ProfileRow; photos: Array<AlbumPhotoActive> } => {
      return !!album.photos && album.photos.length > 0 && !!album.profile && !album.profile.suspended_at;
    });

  return albumsWithPhotos as AlbumWithPhotos[];
}

/**
 * Get a single public album by nickname and slug
 * Tagged with 'albums' and 'profile-[nickname]' for granular invalidation
 * Note: likes_count is now a column on the albums table (updated via triggers)
 */
export async function getAlbumBySlug(nickname: string, albumSlug: string) {
  'use cache';
  cacheLife('max');
  cacheTag('albums');
  cacheTag(`profile-${nickname}`);

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
        photo_url
      )
    `)
    .eq('user_id', userId)
    .eq('is_public', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Filter out albums with no photos
  type AlbumRow = Pick<Tables<'albums'>, 'id' | 'title' | 'description' | 'slug' | 'cover_image_url' | 'is_public' | 'created_at' | 'likes_count'>;
  type ProfileRow = Pick<Tables<'profiles'>, 'full_name' | 'nickname' | 'avatar_url'>;
  type AlbumPhotoActive = Pick<Tables<'album_photos_active'>, 'id' | 'photo_url'>;
  type AlbumQueryResult = AlbumRow & {
    profile: ProfileRow | null;
    photos: Array<AlbumPhotoActive> | null;
  };

  const albumsWithPhotos = (albums || [])
    .filter((album: AlbumQueryResult): album is AlbumQueryResult & { photos: Array<AlbumPhotoActive> } => {
      return !!album.photos && album.photos.length > 0;
    });

  return albumsWithPhotos as AlbumWithPhotos[];
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
        photo_url
      )
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
  type AlbumPhotoActive = Pick<Tables<'album_photos_active'>, 'id' | 'photo_url'>;
  type AlbumQueryResult = AlbumRow & {
    profile: ProfileRow | null;
    photos: Array<AlbumPhotoActive> | null;
  };

  const albumsWithPhotos = (albums || [])
    .filter((album: AlbumQueryResult): album is AlbumQueryResult & { profile: ProfileRow; photos: Array<AlbumPhotoActive> } => {
      return !!album.photos && album.photos.length > 0 && !!album.profile && !album.profile.suspended_at;
    });

  return albumsWithPhotos as AlbumWithPhotos[];
}
