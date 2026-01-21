'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase/client';
import type { AlbumLike } from '@/types/albums';
import type { PhotoLike } from '@/types/photos';

/**
 * Fetch full likes data for a photo (with profiles)
 * Used by DetailLikesSection for on-demand loading
 */
async function fetchPhotoLikes(photoId: string): Promise<{
  likes: PhotoLike[];
  count: number;
  userHasLiked: boolean;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get likes with profiles
  const { data: likes, error } = await supabase
    .from('photo_likes')
    .select(`
      photo_id,
      user_id,
      created_at,
      profile:profiles!photo_likes_user_id_fkey(nickname, avatar_url, full_name)
    `)
    .eq('photo_id', photoId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const userHasLiked = user
    ? likes?.some((like) => like.user_id === user.id) ?? false
    : false;

  return {
    likes: (likes || []).map((like) => ({
      photo_id: like.photo_id,
      user_id: like.user_id,
      created_at: like.created_at || '',
      profile: like.profile as PhotoLike['profile'],
    })),
    count: likes?.length ?? 0,
    userHasLiked,
  };
}

/**
 * Fetch full likes data for an album (with profiles)
 * Used by DetailLikesSection for on-demand loading
 */
async function fetchAlbumLikes(albumId: string): Promise<{
  likes: AlbumLike[];
  count: number;
  userHasLiked: boolean;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get likes with profiles
  const { data: likes, error } = await supabase
    .from('album_likes')
    .select(`
      album_id,
      user_id,
      created_at,
      profile:profiles!album_likes_user_id_fkey(nickname, avatar_url, full_name)
    `)
    .eq('album_id', albumId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const userHasLiked = user
    ? likes?.some((like) => like.user_id === user.id) ?? false
    : false;

  return {
    likes: (likes || []).map((like) => ({
      album_id: like.album_id,
      user_id: like.user_id,
      created_at: like.created_at || '',
      profile: like.profile as AlbumLike['profile'],
    })),
    count: likes?.length ?? 0,
    userHasLiked,
  };
}

/**
 * Lightweight batch fetch - only gets counts from likes_count column
 * Use for card display where we only need the count
 */
async function fetchBatchPhotoLikeCounts(shortIds: string[]): Promise<Map<string, number>> {
  if (shortIds.length === 0) {
    return new Map();
  }

  // Query photos by short_id and get likes_count column directly
  const { data: photos, error } = await supabase
    .from('photos')
    .select('short_id, likes_count')
    .in('short_id', shortIds);

  if (error) {
    throw error;
  }

  // Build count map
  const result = new Map<string, number>();
  for (const photo of photos || []) {
    result.set(photo.short_id, photo.likes_count ?? 0);
  }

  // Ensure all requested short_ids are in the result
  for (const shortId of shortIds) {
    if (!result.has(shortId)) {
      result.set(shortId, 0);
    }
  }

  return result;
}

/**
 * Lightweight batch fetch - only gets counts from likes_count column
 * Use for card display where we only need the count
 */
async function fetchBatchAlbumLikeCounts(slugs: string[]): Promise<Map<string, number>> {
  if (slugs.length === 0) {
    return new Map();
  }

  // Query albums by slug and get likes_count column directly
  const { data: albums, error } = await supabase
    .from('albums')
    .select('slug, likes_count')
    .in('slug', slugs);

  if (error) {
    throw error;
  }

  // Build count map
  const result = new Map<string, number>();
  for (const album of albums || []) {
    result.set(album.slug, album.likes_count ?? 0);
  }

  // Ensure all requested slugs are in the result
  for (const slug of slugs) {
    if (!result.has(slug)) {
      result.set(slug, 0);
    }
  }

  return result;
}

/**
 * Lightweight batch fetch for photo likes - counts only
 * Use for card display in grids/lists for real-time updates
 */
export function useBatchPhotoLikeCounts(shortIds: string[]) {
  return useQuery({
    queryKey: ['batch-photo-like-counts', shortIds.sort().join(',')],
    queryFn: () => fetchBatchPhotoLikeCounts(shortIds),
    enabled: shortIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true, // Refetch when component mounts for fresh data
    refetchOnWindowFocus: false,
  });
}

/**
 * Lightweight batch fetch for album likes - counts only
 * Use for card display in grids/lists for real-time updates
 */
export function useBatchAlbumLikeCounts(slugs: string[]) {
  return useQuery({
    queryKey: ['batch-album-like-counts', slugs.sort().join(',')],
    queryFn: () => fetchBatchAlbumLikeCounts(slugs),
    enabled: slugs.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true, // Refetch when component mounts for fresh data
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching photo likes with full profile data
 * Used by DetailLikesSection to load likers on demand
 */
export function usePhotoLikes(
  photoId: string | undefined,
  options?: {
    initialData?: { likes: PhotoLike[]; count: number; userHasLiked: boolean };
    enabled?: boolean;
    staleTime?: number;
    refetchOnMount?: boolean;
    refetchOnWindowFocus?: boolean;
  },
) {
  // Cache invalidation is handled by the sync handler via getQueryClient()
  // This ensures invalidation works even when this hook is unmounted
  return useQuery({
    queryKey: ['photo-likes', photoId],
    queryFn: () => fetchPhotoLikes(photoId!),
    enabled: options?.enabled !== undefined ? options.enabled : !!photoId,
    initialData: options?.initialData,
    staleTime: options?.staleTime ?? 30 * 1000, // 30 seconds - likes change frequently
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
  });
}

/**
 * Hook for fetching album likes with full profile data
 * Used by DetailLikesSection to load likers on demand
 */
export function useAlbumLikes(
  albumId: string | undefined,
  options?: {
    initialData?: { likes: AlbumLike[]; count: number; userHasLiked: boolean };
    enabled?: boolean;
    staleTime?: number;
    refetchOnMount?: boolean;
    refetchOnWindowFocus?: boolean;
  },
) {
  // Cache invalidation is handled by the sync handler via getQueryClient()
  // This ensures invalidation works even when this hook is unmounted
  return useQuery({
    queryKey: ['album-likes', albumId],
    queryFn: () => fetchAlbumLikes(albumId!),
    enabled: options?.enabled !== undefined ? options.enabled : !!albumId,
    initialData: options?.initialData,
    staleTime: options?.staleTime ?? 30 * 1000, // 30 seconds - likes change frequently
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
  });
}
