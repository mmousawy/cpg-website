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
export async function getProfileStats(
  userId: string,
  nickname: string,
  albumCount: number,
  photoCount: number,
  memberSince: string | null,
) {
  'use cache';
  cacheLife('max');
  cacheTag(`profile-${nickname}`);

  const supabase = createPublicClient();

  // Single RPC call replaces 12+ queries
  const { data: dbStats, error } = await supabase.rpc('get_profile_stats', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error fetching profile stats:', error);
  }

  // Type the RPC response
  const stats = dbStats as {
    eventsAttended: number;
    commentsMade: number;
    likesReceived: number;
    viewsReceived: number;
    challengesParticipated: number;
    challengePhotosAccepted: number;
  } | null;

  return {
    photos: photoCount,
    albums: albumCount,
    eventsAttended: stats?.eventsAttended ?? 0,
    commentsMade: stats?.commentsMade ?? 0,
    commentsReceived: 0, // Not tracked in public profile stats
    likesReceived: stats?.likesReceived ?? 0,
    viewsReceived: stats?.viewsReceived ?? 0,
    challengesParticipated: stats?.challengesParticipated ?? 0,
    challengePhotosAccepted: stats?.challengePhotosAccepted ?? 0,
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
  cacheTag(`photo-${photoShortId}`); // Granular invalidation for this specific photo

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

  // Get all photos in this album (for filmstrip navigation)
  const { data: siblingPhotosData } = await supabase
    .from('album_photos_active')
    .select('photo_url, sort_order, photo:photos!album_photos_photo_id_fkey(short_id, url, blurhash)')
    .eq('album_id', album.id)
    .order('sort_order', { ascending: true });

  type SiblingPhotoData = {
    photo_url: string | null;
    sort_order: number | null;
    photo: {
      short_id: string;
      url: string;
      blurhash: string | null;
    } | null;
  };

  const siblingPhotos = (siblingPhotosData || [])
    .map((sp: SiblingPhotoData) => {
      if (!sp.photo) return null;
      return {
        shortId: sp.photo.short_id,
        url: sp.photo.url,
        blurhash: sp.photo.blurhash,
        sortOrder: sp.sort_order ?? 0,
      };
    })
    .filter((p): p is { shortId: string; url: string; blurhash: string | null; sortOrder: number } => p !== null);

  // Get all albums this photo is in (including album owner profile)
  const { data: albumPhotosData } = await supabase
    .from('album_photos')
    .select('album_id, albums(id, title, slug, cover_image_url, deleted_at, album_photos_active(count), profile:profiles!albums_user_id_fkey(nickname), event:events!albums_event_id_fkey(cover_image))')
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
      event: { cover_image: string | null } | null;
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
        cover_image_url: albumInfo.cover_image_url || albumInfo.event?.cover_image || null,
        photo_count: albumInfo.album_photos_active?.[0]?.count ?? 0,
        profile_nickname: albumInfo.profile?.nickname || null,
      };
    })
    .filter(Boolean) as Array<{ id: string; title: string; slug: string; cover_image_url: string | null; photo_count: number; profile_nickname: string | null }>;

  // Get accepted challenge submissions for this photo
  const { data: challengeSubmissions } = await supabase
    .from('challenge_submissions')
    .select('challenge_id, challenges(id, title, slug, cover_image_url)')
    .eq('photo_id', photo.id)
    .eq('status', 'accepted');

  type ChallengeSubmissionWithChallenge = {
    challenge_id: string;
    challenges: {
      id: string;
      title: string;
      slug: string;
      cover_image_url: string | null;
    } | null;
  };

  const challenges = (challengeSubmissions || [])
    .map((cs: ChallengeSubmissionWithChallenge) => {
      const challenge = cs.challenges;
      if (!challenge) return null;
      return {
        id: challenge.id,
        title: challenge.title,
        slug: challenge.slug,
        cover_image_url: challenge.cover_image_url,
      };
    })
    .filter((c): c is { id: string; title: string; slug: string; cover_image_url: string | null } => c !== null);

  // Use the photo owner's profile for attribution (may differ from album owner in shared albums)
  let photoOwnerProfile = {
    id: profile.id,
    full_name: profile.full_name,
    nickname: profile.nickname!, // We already checked nickname is not null above
    avatar_url: profile.avatar_url,
  };

  if (photo.user_id && photo.user_id !== profile.id) {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id, full_name, nickname, avatar_url')
      .eq('id', photo.user_id)
      .is('suspended_at', null)
      .single();

    if (ownerProfile?.nickname) {
      photoOwnerProfile = {
        id: ownerProfile.id,
        full_name: ownerProfile.full_name,
        nickname: ownerProfile.nickname,
        avatar_url: ownerProfile.avatar_url,
      };
    }
  }

  return {
    photo: photo as Photo,
    profile: photoOwnerProfile,
    albumOwnerNickname: profile.nickname!,
    currentAlbum: album,
    albums,
    challenges,
    siblingPhotos,
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
  cacheTag(`photo-${photoShortId}`); // Granular invalidation for this specific photo

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

  // Get all albums this photo is in (including album owner profile)
  const { data: albumPhotos } = await supabase
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

  const albums = (albumPhotos || [])
    .map((ap: AlbumPhotoWithAlbum) => {
      const album = ap.albums;
      if (!album || album.deleted_at) return null;
      return {
        id: album.id,
        title: album.title,
        slug: album.slug,
        cover_image_url: album.cover_image_url || album.event?.cover_image || null,
        photo_count: album.album_photos_active?.[0]?.count ?? 0,
        profile_nickname: album.profile?.nickname || null,
        event_slug: album.event?.slug || null,
      };
    })
    .filter(Boolean) as Array<{ id: string; title: string; slug: string; cover_image_url: string | null; photo_count: number; profile_nickname: string | null; event_slug: string | null }>;

  // Get accepted challenge submissions for this photo
  const { data: challengeSubmissions } = await supabase
    .from('challenge_submissions')
    .select('challenge_id, challenges(id, title, slug, cover_image_url)')
    .eq('photo_id', photo.id)
    .eq('status', 'accepted');

  type ChallengeSubmissionWithChallenge = {
    challenge_id: string;
    challenges: {
      id: string;
      title: string;
      slug: string;
      cover_image_url: string | null;
    } | null;
  };

  const challenges = (challengeSubmissions || [])
    .map((cs: ChallengeSubmissionWithChallenge) => {
      const challenge = cs.challenges;
      if (!challenge) return null;
      return {
        id: challenge.id,
        title: challenge.title,
        slug: challenge.slug,
        cover_image_url: challenge.cover_image_url,
      };
    })
    .filter((c): c is { id: string; title: string; slug: string; cover_image_url: string | null } => c !== null);

  return {
    photo: photo as Photo,
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      nickname: profile.nickname!, // We already checked nickname is not null above
      avatar_url: profile.avatar_url,
    },
    albums,
    challenges,
  };
}
