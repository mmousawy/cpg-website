import { cacheTag, cacheLife } from 'next/cache';
import { createPublicClient } from '@/utils/supabase/server';
import type { AlbumWithPhotos } from '@/types/albums';

/**
 * Get recent public albums for homepage
 * Tagged with 'albums' for granular cache invalidation
 */
export async function getRecentAlbums(limit = 6) {
  'use cache';
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
      profile:profiles(full_name, nickname, avatar_url, suspended_at),
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
    }) as unknown as AlbumWithPhotos[];

  return albumsWithPhotos;
}

/**
 * Get all public albums for gallery page
 * Tagged with 'albums' for granular cache invalidation
 */
export async function getPublicAlbums(limit = 50) {
  'use cache';
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
      profile:profiles(full_name, nickname, avatar_url, suspended_at),
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
    }) as unknown as AlbumWithPhotos[];

  return albumsWithPhotos;
}

/**
 * Get a single public album by nickname and slug
 * Tagged with 'albums' and 'profile-[nickname]' for granular invalidation
 */
export async function getAlbumBySlug(nickname: string, albumSlug: string) {
  'use cache';
  cacheLife('hours'); // Cache for at least 1 hour to enable prerendering
  cacheTag('albums');
  cacheTag(`profile-${nickname}`);

  const supabase = createPublicClient();

  // First get the user by nickname
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .single();

  if (!profile) {
    return null;
  }

  // Get album with photos and moderation data
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
      profile:profiles(full_name, avatar_url, nickname),
      photos:album_photos_active(
        id,
        photo_url,
        title,
        width,
        height,
        sort_order
      )
    `)
    .eq('user_id', profile.id)
    .eq('slug', albumSlug)
    .eq('is_public', true)
    .is('deleted_at', null)
    .single();

  if (error || !album) {
    return null;
  }

  return album;
}

/**
 * Get photos data for an album by their URLs
 * Tagged with 'albums' for cache invalidation
 */
export async function getPhotosByUrls(photoUrls: string[]) {
  'use cache';
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

  return photos || [];
}

/**
 * Get public albums for a specific user profile
 * Tagged with both 'albums' and 'profile-[nickname]' for granular invalidation
 */
export async function getUserPublicAlbums(userId: string, nickname: string, limit = 50) {
  'use cache';
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
      profile:profiles(full_name, nickname, avatar_url),
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
    .filter((album) => album.photos && album.photos.length > 0) as unknown as AlbumWithPhotos[];

  return albumsWithPhotos;
}
