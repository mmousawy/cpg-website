'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase/client';
import type { AlbumLike } from '@/types/albums';
import type { PhotoLike } from '@/types/photos';

async function fetchPhotoLikes(photoId: string): Promise<{
  likes: PhotoLike[];
  count: number;
  userHasLiked: boolean;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: likes, error } = await supabase
    .from('photo_likes')
    .select(`
      photo_id,
      user_id,
      created_at,
      profile:profiles!photo_likes_user_id_fkey(nickname, avatar_url, full_name, suspended_at, deletion_scheduled_at)
    `)
    .eq('photo_id', photoId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  type LikeProfile = { nickname: string | null; avatar_url: string | null; full_name: string | null; suspended_at: string | null; deletion_scheduled_at: string | null };
  const activeLikes = (likes || []).filter((like) => {
    const p = like.profile as LikeProfile | null;
    return !p?.suspended_at && !p?.deletion_scheduled_at;
  });

  const userHasLiked = user
    ? activeLikes?.some((like) => like.user_id === user.id) ?? false
    : false;

  return {
    likes: activeLikes.map((like) => ({
      photo_id: like.photo_id,
      user_id: like.user_id,
      created_at: like.created_at || '',
      profile: like.profile as PhotoLike['profile'],
    })),
    count: activeLikes.length,
    userHasLiked,
  };
}

async function fetchAlbumLikes(albumId: string): Promise<{
  likes: AlbumLike[];
  count: number;
  userHasLiked: boolean;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: likes, error } = await supabase
    .from('album_likes')
    .select(`
      album_id,
      user_id,
      created_at,
      profile:profiles!album_likes_user_id_fkey(nickname, avatar_url, full_name, suspended_at, deletion_scheduled_at)
    `)
    .eq('album_id', albumId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  type LikeProfile = { nickname: string | null; avatar_url: string | null; full_name: string | null; suspended_at: string | null; deletion_scheduled_at: string | null };
  const activeLikes = (likes || []).filter((like) => {
    const p = like.profile as LikeProfile | null;
    return !p?.suspended_at && !p?.deletion_scheduled_at;
  });

  const userHasLiked = user
    ? activeLikes?.some((like) => like.user_id === user.id) ?? false
    : false;

  return {
    likes: activeLikes.map((like) => ({
      album_id: like.album_id,
      user_id: like.user_id,
      created_at: like.created_at || '',
      profile: like.profile as AlbumLike['profile'],
    })),
    count: activeLikes.length,
    userHasLiked,
  };
}

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
  return useQuery({
    queryKey: ['photo-likes', photoId],
    queryFn: () => fetchPhotoLikes(photoId!),
    enabled: options?.enabled !== undefined ? options.enabled : !!photoId,
    initialData: options?.initialData,
    staleTime: options?.staleTime ?? 30 * 1000,
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
  });
}

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
  return useQuery({
    queryKey: ['album-likes', albumId],
    queryFn: () => fetchAlbumLikes(albumId!),
    enabled: options?.enabled !== undefined ? options.enabled : !!albumId,
    initialData: options?.initialData,
    staleTime: options?.staleTime ?? 30 * 1000,
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
  });
}
