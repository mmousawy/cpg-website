import type { AlbumWithPhotos } from '@/types/albums';
import type { Photo } from '@/types/photos';
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

  return (data || [])
    .filter((a) => a.slug && (a.profile as any)?.nickname)
    .map((a) => ({
      nickname: (a.profile as any).nickname as string,
      albumSlug: a.slug as string,
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
  const albumsWithPhotos = ((albums || []) as any[])
    .filter((album) => {
      const profile = album.profile as any;
      return album.photos && album.photos.length > 0 && profile && !profile.suspended_at;
    });

  return albumsWithPhotos as unknown as AlbumWithPhotos[];
}

/**
 * Get all public albums for gallery page
 * Tagged with 'albums' for granular cache invalidation
 * Note: likes_count is now a column on the albums table (updated via triggers)
 */
export async function getPublicAlbums(limit = 50) {
  'use cache';
  cacheLife('max');
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
  const albumsWithPhotos = ((albums || []) as any[])
    .filter((album) => {
      const profile = album.profile as any;
      return album.photos && album.photos.length > 0 && profile && !profile.suspended_at;
    });

  return albumsWithPhotos as unknown as AlbumWithPhotos[];
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
  const albumsWithPhotos = ((albums || []) as any[])
    .filter((album) => album.photos && album.photos.length > 0);

  return albumsWithPhotos as unknown as AlbumWithPhotos[];
}
