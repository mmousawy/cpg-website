import type { Tables } from '@/database.types';
import type { Interest } from '@/types/interests';
import type { Photo } from '@/types/photos';
import { createPublicClient } from '@/utils/supabase/server';
import { cacheLife, cacheTag } from 'next/cache';

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
  interests?: Interest[] | null;
};

/**
 * Get all profile nicknames for static generation
 * Used in generateStaticParams to pre-render profile pages
 * No caching needed - only called at build time
 * Returns '@nickname' format (canonical URL format)
 */
export async function getAllProfileNicknames() {
  const supabase = createPublicClient();

  const { data } = await supabase
    .from('profiles')
    .select('nickname')
    .not('nickname', 'is', null)
    .is('suspended_at', null);

  const nicknames = (data || []).map((p) => p.nickname).filter((n): n is string => n !== null);

  // Return with @ prefix (canonical URL format)
  return nicknames.map((n) => `@${n}`);
}

/**
 * Get organizers (admins) for homepage
 * Tagged with 'profiles' for granular cache invalidation
 */
export async function getOrganizers(limit = 5) {
  'use cache';
  cacheLife('max');
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
  cacheLife('max');
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
 * Get profile interests for a user
 * Tagged with specific profile tag for granular invalidation
 */
export async function getProfileInterests(userId: string, nickname: string) {
  'use cache';
  cacheLife('max');
  cacheTag(`profile-${nickname}`);
  cacheTag('interests');

  const supabase = createPublicClient();

  const { data: profileInterests } = await supabase
    .from('profile_interests')
    .select('interest')
    .eq('profile_id', userId);

  if (!profileInterests || profileInterests.length === 0) {
    return [];
  }

  const interestNames = profileInterests.map((pi) => pi.interest);

  // Fetch full interest data with counts
  const { data: interests } = await supabase
    .from('interests')
    .select('id, name, count, created_at')
    .in('name', interestNames);

  return (interests || []) as Interest[];
}

/**
 * Get a public profile by nickname
 * Tagged with specific profile tag for granular invalidation
 */
export async function getProfileByNickname(nickname: string) {
  'use cache';
  cacheLife('max');
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

  // Load interests for this profile
  const interests = await getProfileInterests(profile.id, nickname);

  return {
    ...profile,
    interests,
  } as unknown as ProfileData;
}

/**
 * Get public photos for a user profile
 * Tagged with specific profile tag for granular invalidation
 */
export async function getUserPublicPhotos(userId: string, nickname: string, limit = 50) {
  'use cache';
  cacheLife('max');
  cacheTag(`profile-${nickname}`);

  const supabase = createPublicClient();

  // Note: likes_count is now a column on the photos table (updated via triggers)
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

  // likes_count is already included in the photo object from the database
  return photos || [];
}

/**
 * Get public photo count for a user
 * Tagged with specific profile tag for granular invalidation
 */
export async function getUserPublicPhotoCount(userId: string, nickname: string) {
  'use cache';
  cacheLife('max');
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
  cacheLife('max');
  cacheTag(`profile-${nickname}`);

  const supabase = createPublicClient();

  let eventsAttended = 0;
  let commentsMade = 0;
  let commentsReceived = 0;
  let likesReceived = 0;
  let viewsReceived = 0;

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

  // Get likes received count (sum of likes_count from photos and albums)
  try {
    // Get user's photos with likes_count
    const { data: userPhotos } = await supabase
      .from('photos')
      .select('likes_count')
      .eq('user_id', userId)
      .eq('is_public', true)
      .is('deleted_at', null) as { data: Array<{ likes_count: number }> | null };

    // Get user's albums with likes_count
    const { data: userAlbums } = await supabase
      .from('albums')
      .select('likes_count')
      .eq('user_id', userId)
      .eq('is_public', true)
      .is('deleted_at', null) as { data: Array<{ likes_count: number }> | null };

    if (userPhotos) {
      likesReceived += userPhotos.reduce((sum, photo) => sum + (photo.likes_count || 0), 0);
    }

    if (userAlbums) {
      likesReceived += userAlbums.reduce((sum, album) => sum + (album.likes_count || 0), 0);
    }
  } catch {
    // Likes tables might not exist
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

  // Get views received count (sum of view_count from photos and albums)
  try {
    // Get user's photos with view_count
    const { data: userPhotos } = await supabase
      .from('photos')
      .select('view_count')
      .eq('user_id', userId)
      .eq('is_public', true)
      .is('deleted_at', null) as { data: Array<{ view_count: number }> | null };

    // Get user's albums with view_count
    const { data: userAlbums } = await supabase
      .from('albums')
      .select('view_count')
      .eq('user_id', userId)
      .eq('is_public', true)
      .is('deleted_at', null) as { data: Array<{ view_count: number }> | null };

    if (userPhotos) {
      viewsReceived += userPhotos.reduce((sum, photo) => sum + (photo.view_count || 0), 0);
    }

    if (userAlbums) {
      viewsReceived += userAlbums.reduce((sum, album) => sum + (album.view_count || 0), 0);
    }
  } catch {
    // View count columns might not exist yet
  }

  return {
    photos: photoCount,
    albums: albumCount,
    eventsAttended,
    commentsMade,
    commentsReceived,
    likesReceived,
    viewsReceived,
    memberSince,
  };
}

/**
 * Get a photo within an album context by short_id
 * Tagged with profile and albums tags for granular invalidation
 */
export async function getAlbumPhotoByShortId(nickname: string, albumSlug: string, photoShortId: string) {
  'use cache';
  cacheLife('max');
  cacheTag(`profile-${nickname}`);
  cacheTag('albums');

  const supabase = createPublicClient();

  // Get profile first
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .eq('nickname', nickname)
    .is('suspended_at', null)
    .single();

  if (!profile || !profile.nickname) {
    return null;
  }

  // Get album with photo count
  const { data: albumData } = await supabase
    .from('albums')
    .select('id, title, slug, description, cover_image_url, album_photos_active(count)')
    .eq('user_id', profile.id)
    .eq('slug', albumSlug)
    .eq('is_public', true)
    .is('deleted_at', null)
    .single();

  if (!albumData) {
    return null;
  }

  const album = {
    id: albumData.id,
    title: albumData.title,
    slug: albumData.slug,
    description: albumData.description,
    cover_image_url: albumData.cover_image_url,
    photo_count: (albumData.album_photos_active as Array<{ count: number }>)?.[0]?.count ?? 0,
  };

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

  // Verify photo is part of this album
  const { data: albumPhoto } = await supabase
    .from('album_photos')
    .select('id')
    .eq('album_id', album.id)
    .eq('photo_id', photo.id)
    .single();

  if (!albumPhoto) {
    return null;
  }

  // Get all albums this photo is in
  const { data: albumPhotosData } = await supabase
    .from('album_photos')
    .select('album_id, albums(id, title, slug, cover_image_url, deleted_at, album_photos_active(count))')
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
    } | null;
  };

  const albums = (albumPhotosData || [])
    .map((ap: AlbumPhotoWithAlbum) => {
      const albumInfo = ap.albums;
      if (!albumInfo || albumInfo.deleted_at) return null;
      return {
        id: albumInfo.id,
        title: albumInfo.title,
        slug: albumInfo.slug,
        cover_image_url: albumInfo.cover_image_url,
        photo_count: albumInfo.album_photos_active?.[0]?.count ?? 0,
      };
    })
    .filter((a): a is { id: string; title: string; slug: string; cover_image_url: string | null; photo_count: number } => a !== null);

  return {
    photo: photo as Photo,
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      nickname: profile.nickname!, // We already checked nickname is not null above
      avatar_url: profile.avatar_url,
    },
    currentAlbum: album,
    albums,
  };
}

/**
 * Get a single public photo by short_id and nickname
 * Tagged with profile tag for granular invalidation
 */
export async function getPhotoByShortId(nickname: string, photoShortId: string) {
  'use cache';
  cacheLife('max');
  cacheTag(`profile-${nickname}`);

  const supabase = createPublicClient();

  // Get profile first
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .eq('nickname', nickname)
    .is('suspended_at', null)
    .single();

  if (!profile || !profile.nickname) {
    return null;
  }

  // Get photo with tags (must be public, exclude event cover images)
  const { data: photo } = await supabase
    .from('photos')
    .select('*, tags:photo_tags(tag)')
    .eq('short_id', photoShortId)
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%')
    .single();

  if (!photo) {
    return null;
  }

  // Get all albums this photo is in
  const { data: albumPhotos } = await supabase
    .from('album_photos')
    .select('album_id, albums(id, title, slug, cover_image_url, deleted_at, album_photos_active(count))')
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
    } | null;
  };

  const albums = (albumPhotos || [])
    .map((ap: AlbumPhotoWithAlbum) => {
      const album = ap.albums;
      if (!album || album.deleted_at) return null;
      return {
        id: album.id,
        title: album.title,
        slug: album.slug,
        cover_image_url: album.cover_image_url,
        photo_count: album.album_photos_active?.[0]?.count ?? 0,
      };
    })
    .filter((a): a is { id: string; title: string; slug: string; cover_image_url: string | null; photo_count: number } => a !== null);

  return {
    photo: photo as Photo,
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      nickname: profile.nickname!, // We already checked nickname is not null above
      avatar_url: profile.avatar_url,
    },
    albums,
  };
}
