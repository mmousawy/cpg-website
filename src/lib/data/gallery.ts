import type { Photo, Tag } from '@/types/photos';
import { createPublicClient } from '@/utils/supabase/server';
import { cacheLife, cacheTag } from 'next/cache';

/** Photo with owner profile info for display in community stream */
export type StreamPhoto = Photo & {
  profile: {
    nickname: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

/**
 * Get recent public photos for the community photostream
 * Shows photos from all users, ordered by creation date
 * Tagged with 'gallery' for cache invalidation
 */
export async function getPublicPhotostream(limit = 100) {
  'use cache';
  cacheLife('max');
  cacheTag('gallery');

  const supabase = createPublicClient();

  // Fetch photos (likes_count is now a column on the photos table)
  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!photos || photos.length === 0) {
    return [];
  }

  // Get unique user IDs
  const userIds = [...new Set(photos.map((p) => p.user_id).filter((id): id is string => id !== null))];

  // Fetch profiles for these users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, full_name, avatar_url, suspended_at')
    .in('id', userIds);

  // Create a map for quick lookup
  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p]),
  );

  // Filter out photos from suspended users and merge with profile data
  // Note: likes_count is already included in the photo object from the database
  const validPhotos = photos
    .filter((p) => {
      if (!p.user_id) return false;
      const profile = profileMap.get(p.user_id);
      return profile && !profile.suspended_at && profile.nickname;
    })
    .map((p) => {
      const profile = profileMap.get(p.user_id!);
      return {
        ...p,
        profile: profile ? {
          nickname: profile.nickname!,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        } : null,
      } as StreamPhoto;
    });

  return validPhotos;
}

/**
 * Get recently liked photos (photos that received likes recently)
 * Shows photos ordered by most recent like timestamp
 * Tagged with 'gallery' for cache invalidation
 */
export async function getRecentlyLikedPhotos(limit = 10) {
  'use cache';
  cacheLife('max');
  cacheTag('gallery');

  const supabase = createPublicClient();

  // Get recently liked photo IDs (ordered by most recent like)
  const { data: recentLikes } = await supabase
    .from('photo_likes')
    .select('photo_id, created_at, photos!inner(id, is_public, deleted_at, storage_path)')
    .eq('photos.is_public', true)
    .is('photos.deleted_at', null)
    .not('photos.storage_path', 'like', 'events/%')
    .order('created_at', { ascending: false })
    .limit(limit * 2); // Get more to account for duplicates

  if (!recentLikes || recentLikes.length === 0) {
    return [];
  }

  // Get unique photo IDs (first occurrence = most recently liked)
  const seenPhotoIds = new Set<string>();
  const uniquePhotoIds: string[] = [];
  for (const like of recentLikes) {
    const photoId = like.photo_id;
    if (!seenPhotoIds.has(photoId)) {
      seenPhotoIds.add(photoId);
      uniquePhotoIds.push(photoId);
      if (uniquePhotoIds.length >= limit) {
        break;
      }
    }
  }

  if (uniquePhotoIds.length === 0) {
    return [];
  }

  // Fetch the actual photos
  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .in('id', uniquePhotoIds)
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%');

  if (!photos || photos.length === 0) {
    return [];
  }

  // Get unique user IDs
  const userIds = [...new Set(photos.map((p) => p.user_id).filter((id): id is string => id !== null))];

  // Fetch profiles for these users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, full_name, avatar_url, suspended_at')
    .in('id', userIds);

  // Create a map for quick lookup
  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p]),
  );

  // Create a map of photo_id -> most recent like timestamp for sorting
  const photoLikeTimeMap = new Map<string, string>();
  for (const like of recentLikes) {
    if (!photoLikeTimeMap.has(like.photo_id)) {
      const likeTime = like.created_at;
      if (likeTime) {
        photoLikeTimeMap.set(like.photo_id, likeTime);
      }
    }
  }

  // Filter out photos from suspended users, merge with profile data, and sort by most recent like
  const validPhotos = photos
    .filter((p) => {
      if (!p.user_id) return false;
      const profile = profileMap.get(p.user_id);
      return profile && !profile.suspended_at && profile.nickname;
    })
    .map((p) => {
      const profile = profileMap.get(p.user_id!);
      return {
        ...p,
        profile: profile ? {
          nickname: profile.nickname!,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        } : null,
        _likeTime: photoLikeTimeMap.get(p.id) || p.created_at, // For sorting
      } as StreamPhoto & { _likeTime: string };
    })
    .sort((a, b) => {
      // Sort by most recent like timestamp
      const aTime = a._likeTime || a.created_at || '';
      const bTime = b._likeTime || b.created_at || '';
      return bTime.localeCompare(aTime);
    })
    .slice(0, limit)
    .map(({ _likeTime, ...photo }) => photo as StreamPhoto); // Remove temporary sorting field

  return validPhotos;
}

/**
 * Get popular tags ordered by usage count
 * Calculates count dynamically from non-deleted public photos only
 * Tagged with 'gallery' for cache invalidation
 */
export async function getPopularTags(limit = 30) {
  'use cache';
  cacheLife('max');
  cacheTag('gallery');

  const supabase = createPublicClient();

  // Get tag counts from photo_tags joined with valid photos
  const { data: tagCounts } = await supabase
    .from('photo_tags')
    .select(`
      tag,
      photos!inner(id, is_public, deleted_at)
    `)
    .eq('photos.is_public', true)
    .is('photos.deleted_at', null);

  if (!tagCounts || tagCounts.length === 0) {
    return [];
  }

  // Count occurrences of each tag
  const countMap = new Map<string, number>();
  for (const row of tagCounts) {
    const current = countMap.get(row.tag) || 0;
    countMap.set(row.tag, current + 1);
  }

  // Convert to array and sort by count desc, then name asc
  const tags = Array.from(countMap.entries())
    .map(([name, count]) => ({ id: name, name, count, created_at: null }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);

  return tags as Tag[];
}

/**
 * Get popular tags with member counts (how many members use each tag)
 * Tagged with 'gallery' for cache invalidation
 */
export async function getPopularTagsWithMemberCounts(limit = 20) {
  'use cache';
  cacheLife('max');
  cacheTag('gallery');

  const supabase = createPublicClient();

  // Get popular tags
  const tags = await getPopularTags(limit * 2); // Get more to filter

  if (tags.length === 0) {
    return [];
  }

  const tagNames = tags.map((t) => t.name);

  // Get unique user IDs per tag
  const { data: photoTags } = await supabase
    .from('photo_tags')
    .select('tag, photos!inner(user_id, is_public, deleted_at)')
    .in('tag', tagNames)
    .eq('photos.is_public', true)
    .is('photos.deleted_at', null);

  if (!photoTags || photoTags.length === 0) {
    return [];
  }

  // Count unique members per tag
  const tagMemberCounts = new Map<string, Set<string>>();
  photoTags.forEach((pt) => {
    const photo = pt.photos as any;
    if (photo?.user_id) {
      if (!tagMemberCounts.has(pt.tag)) {
        tagMemberCounts.set(pt.tag, new Set());
      }
      tagMemberCounts.get(pt.tag)!.add(photo.user_id);
    }
  });

  // Map tags with member counts
  const tagsWithCounts = tags
    .map((tag) => ({
      ...tag,
      memberCount: tagMemberCounts.get(tag.name)?.size || 0,
    }))
    .filter((tag) => tag.memberCount > 0) // Only include tags with members
    .sort((a, b) => {
      // Sort by member count first, then by photo count
      if (b.memberCount !== a.memberCount) {
        return b.memberCount - a.memberCount;
      }
      return (b.count || 0) - (a.count || 0);
    })
    .slice(0, limit);

  return tagsWithCounts;
}

/**
 * Get public photos with a specific tag
 * Tagged with 'gallery' for cache invalidation
 */
export async function getPhotosByTag(tagName: string, limit = 100) {
  'use cache';
  cacheLife('max');
  cacheTag('gallery');
  cacheTag(`tag-${tagName}`);

  const supabase = createPublicClient();

  // First get photo IDs that have this tag
  const { data: photoTags } = await supabase
    .from('photo_tags')
    .select('photo_id')
    .eq('tag', tagName);

  if (!photoTags || photoTags.length === 0) {
    return [];
  }

  const photoIds = photoTags.map((pt) => pt.photo_id);

  // Fetch the actual photos (likes_count is now a column on the photos table)
  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .in('id', photoIds)
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!photos || photos.length === 0) {
    return [];
  }

  // Get unique user IDs
  const userIds = [...new Set(photos.map((p) => p.user_id).filter((id): id is string => id !== null))];

  // Fetch profiles for these users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, full_name, avatar_url, suspended_at')
    .in('id', userIds);

  // Create a map for quick lookup
  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p]),
  );

  // Filter out photos from suspended users and merge with profile data
  // Note: likes_count is already included in the photo object from the database
  const validPhotos = photos
    .filter((p) => {
      if (!p.user_id) return false;
      const profile = profileMap.get(p.user_id);
      return profile && !profile.suspended_at && profile.nickname;
    })
    .map((p) => {
      const profile = profileMap.get(p.user_id!);
      return {
        ...p,
        profile: profile ? {
          nickname: profile.nickname!,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        } : null,
      } as StreamPhoto;
    });

  return validPhotos;
}

/**
 * Get all tag names for static generation
 * Returns tags that have at least one photo
 */
export async function getAllTagNames() {
  const supabase = createPublicClient();

  const { data: tags } = await supabase
    .from('tags')
    .select('name')
    .gt('count', 0);

  return (tags || []).map((t) => t.name);
}
