import type { AlbumLike } from '@/types/albums';
import type { PhotoLike } from '@/types/photos';
import { createPublicClient } from '@/utils/supabase/server';
import { cacheLife, cacheTag } from 'next/cache';

/**
 * Get likes for a photo with profile information
 * Tagged with profile-{nickname} for cache invalidation
 */
export async function getPhotoLikes(photoId: string): Promise<{
  likes: PhotoLike[];
  count: number;
  userHasLiked: boolean;
}> {
  'use cache';
  cacheLife('max');
  cacheTag(`photo-likes-${photoId}`);

  const supabase = createPublicClient();

  // Get photo to determine owner nickname for cache tag
  // Photos don't have direct FK to profiles, so query separately
  const { data: photo } = await supabase
    .from('photos')
    .select('user_id')
    .eq('id', photoId)
    .maybeSingle();

  if (photo?.user_id) {
    // Get profile separately since photos.user_id references auth.users, not profiles directly
    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', photo.user_id)
      .maybeSingle();

    if (profile?.nickname) {
      cacheTag(`profile-${profile.nickname}`);
    }
  }

  // Get likes with profiles
  // Use explicit foreign key relationship name
  const { data: likes } = await supabase
    .from('photo_likes')
    .select(`
      photo_id,
      user_id,
      created_at,
      profile:profiles!photo_likes_user_id_fkey!inner(nickname, avatar_url, full_name)
    `)
    .eq('photo_id', photoId)
    .order('created_at', { ascending: false });

  // Note: userHasLiked is determined client-side in LikeButton component
  // We can't check auth.uid() in cached functions with public client
  return {
    likes: (likes || []).map((like) => ({
      photo_id: like.photo_id,
      user_id: like.user_id,
      created_at: like.created_at || '',
      profile: like.profile as PhotoLike['profile'],
    })),
    count: likes?.length ?? 0,
    userHasLiked: false, // Will be determined client-side
  };
}

/**
 * Get likes for an album with profile information
 * Tagged with profile-{nickname} for cache invalidation
 */
export async function getAlbumLikes(albumId: string): Promise<{
  likes: AlbumLike[];
  count: number;
  userHasLiked: boolean;
}> {
  'use cache';
  cacheLife('max');
  cacheTag(`album-likes-${albumId}`);

  const supabase = createPublicClient();

  // Get album to determine owner nickname for cache tag
  // Use explicit relationship name to avoid ambiguity with album_likes
  const { data: album } = await supabase
    .from('albums')
    .select('user_id, profile:profiles!albums_user_id_fkey!inner(nickname)')
    .eq('id', albumId)
    .maybeSingle();

  type AlbumWithProfile = {
    user_id: string;
    profile: { nickname: string } | null;
  };

  if (album) {
    const typedAlbum = album as AlbumWithProfile;
    if (typedAlbum.profile?.nickname) {
      cacheTag(`profile-${typedAlbum.profile.nickname}`);
    }
  }

  // Get likes with profiles
  // Use explicit foreign key relationship name
  const { data: likes } = await supabase
    .from('album_likes')
    .select(`
      album_id,
      user_id,
      created_at,
      profile:profiles!album_likes_user_id_fkey!inner(nickname, avatar_url, full_name)
    `)
    .eq('album_id', albumId)
    .order('created_at', { ascending: false });

  // Note: userHasLiked is determined client-side in LikeButton component
  // We can't check auth.uid() in cached functions with public client
  return {
    likes: (likes || []).map((like) => ({
      album_id: like.album_id,
      user_id: like.user_id,
      created_at: like.created_at || '',
      profile: like.profile as AlbumLike['profile'],
    })),
    count: likes?.length ?? 0,
    userHasLiked: false, // Will be determined client-side
  };
}
