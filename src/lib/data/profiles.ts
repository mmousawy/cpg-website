import { cacheTag } from 'next/cache';
import { createPublicClient } from '@/utils/supabase/server';
import type { Tables } from '@/database.types';
import type { Photo } from '@/types/photos';

type Organizer = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'nickname' | 'avatar_url' | 'bio'>;
type Member = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'nickname' | 'avatar_url'>;

type SocialLink = { label: string; url: string };

export type ProfileData = Pick<Tables<'profiles'>,
  | 'id'
  | 'full_name'
  | 'nickname'
  | 'avatar_url'
  | 'bio'
  | 'website'
  | 'created_at'
> & {
  social_links: SocialLink[] | null;
};

/**
 * Get organizers (admins) for homepage
 * Tagged with 'profiles' for granular cache invalidation
 */
export async function getOrganizers(limit = 5) {
  'use cache';
  cacheTag('profiles');

  const supabase = createPublicClient();

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url, bio')
    .eq('is_admin', true)
    .is('suspended_at', null)
    .limit(limit);

  return (data || []) as Organizer[];
}

/**
 * Get recent members for homepage
 * Tagged with 'profiles' for granular cache invalidation
 */
export async function getRecentMembers(limit = 12) {
  'use cache';
  cacheTag('profiles');

  const supabase = createPublicClient();

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .not('nickname', 'is', null)
    .is('suspended_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []) as Member[];
}

/**
 * Get a public profile by nickname
 * Tagged with specific profile tag for granular invalidation
 */
export async function getProfileByNickname(nickname: string) {
  'use cache';
  cacheTag(`profile-${nickname}`);
  cacheTag('profiles');

  const supabase = createPublicClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url, bio, website, social_links, created_at')
    .eq('nickname', nickname)
    .is('suspended_at', null)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile as unknown as ProfileData;
}

/**
 * Get public photos for a user profile
 * Tagged with specific profile tag for granular invalidation
 */
export async function getUserPublicPhotos(userId: string, nickname: string, limit = 50) {
  'use cache';
  cacheTag(`profile-${nickname}`);

  const supabase = createPublicClient();

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('user_id', userId)
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  return (photos || []) as Photo[];
}

/**
 * Get public photo count for a user
 * Tagged with specific profile tag for granular invalidation
 */
export async function getUserPublicPhotoCount(userId: string, nickname: string) {
  'use cache';
  cacheTag(`profile-${nickname}`);

  const supabase = createPublicClient();

  const { count } = await supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%');

  return count ?? 0;
}

/**
 * Get public profile stats
 * Tagged with specific profile tag for granular invalidation
 */
export async function getProfileStats(userId: string, nickname: string, albumCount: number, photoCount: number, memberSince: string | null) {
  'use cache';
  cacheTag(`profile-${nickname}`);

  const supabase = createPublicClient();

  let eventsAttended = 0;
  let commentsMade = 0;
  let commentsReceived = 0;

  // Get events attended count
  try {
    const { data: rsvpsData } = await supabase
      .from('events_rsvps')
      .select('attended_at, confirmed_at, canceled_at, event_id, events!inner(id)')
      .eq('user_id', userId)
      .not('attended_at', 'is', null)
      .not('confirmed_at', 'is', null)
      .is('canceled_at', null);

    if (rsvpsData) {
      eventsAttended = rsvpsData.length;
    }
  } catch {
    // RSVPs table might not exist or have issues
  }

  // Get comments made count
  try {
    const { count } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (count !== null) {
      commentsMade = count;
    }
  } catch {
    // Comments table might not exist
  }

  // Get comments received count
  try {
    // Get user's album IDs
    const { data: userAlbums } = await supabase
      .from('albums')
      .select('id')
      .eq('user_id', userId)
      .eq('is_public', true)
      .is('deleted_at', null);

    // Get user's photo IDs
    const { data: userPhotos } = await supabase
      .from('photos')
      .select('id')
      .eq('user_id', userId)
      .eq('is_public', true)
      .is('deleted_at', null);

    // Count comments on albums
    if (userAlbums && userAlbums.length > 0) {
      const albumIds = userAlbums.map(a => a.id);
      const { data: albumCommentIds } = await supabase
        .from('album_comments')
        .select('comment_id')
        .in('album_id', albumIds);

      if (albumCommentIds && albumCommentIds.length > 0) {
        const commentIds = albumCommentIds.map(ac => ac.comment_id);
        const { count: albumCommentsCount } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .in('id', commentIds)
          .is('deleted_at', null)
          .neq('user_id', userId);

        if (albumCommentsCount !== null) {
          commentsReceived += albumCommentsCount;
        }
      }
    }

    // Count comments on photos
    if (userPhotos && userPhotos.length > 0) {
      const photoIds = userPhotos.map(p => p.id);
      const { data: photoCommentIds } = await supabase
        .from('photo_comments')
        .select('comment_id')
        .in('photo_id', photoIds);

      if (photoCommentIds && photoCommentIds.length > 0) {
        const commentIds = photoCommentIds.map(pc => pc.comment_id);
        const { count: photoCommentsCount } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .in('id', commentIds)
          .is('deleted_at', null)
          .neq('user_id', userId);

        if (photoCommentsCount !== null) {
          commentsReceived += photoCommentsCount;
        }
      }
    }
  } catch {
    // Comments tables might not exist
  }

  return {
    photos: photoCount,
    albums: albumCount,
    eventsAttended,
    commentsMade,
    commentsReceived,
    memberSince,
  };
}
