import { cacheTag, cacheLife } from 'next/cache';
import { createPublicClient } from '@/utils/supabase/server';
import type { Tables } from '@/database.types';
import type { Interest } from '@/types/interests';

type Member = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'nickname' | 'avatar_url'>;

export type MemberWithCreatedAt = Member & {
  created_at: string;
};

export type MemberWithActivity = Member & {
  recent_activity_count?: number;
  last_activity_at?: string | null;
};

export type InterestWithMembers = {
  interest: Interest;
  members: Member[];
};

/**
 * Get recently active members (uploaded photos/albums recently)
 * Tagged with 'profiles' and 'gallery' for cache invalidation
 */
export async function getRecentlyActiveMembers(limit = 12) {
  'use cache';
  cacheLife('max');
  cacheTag('profiles');
  cacheTag('gallery');

  const supabase = createPublicClient();

  // Get members who uploaded photos in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get recent photo uploads grouped by user
  const { data: recentPhotos } = await supabase
    .from('photos')
    .select('user_id, created_at')
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  // Get recent album creations grouped by user
  const { data: recentAlbums } = await supabase
    .from('albums')
    .select('user_id, created_at')
    .eq('is_public', true)
    .is('deleted_at', null)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  // Combine and count activities per user
  const userActivity = new Map<string, { count: number; lastActivity: string }>();

  (recentPhotos || []).forEach((photo) => {
    if (!photo.user_id || !photo.created_at) return;
    const existing = userActivity.get(photo.user_id);
    if (existing) {
      existing.count += 1;
      if (photo.created_at > existing.lastActivity) {
        existing.lastActivity = photo.created_at;
      }
    } else {
      userActivity.set(photo.user_id, { count: 1, lastActivity: photo.created_at });
    }
  });

  (recentAlbums || []).forEach((album) => {
    if (!album.user_id || !album.created_at) return;
    const existing = userActivity.get(album.user_id);
    if (existing) {
      existing.count += 1;
      if (album.created_at > existing.lastActivity) {
        existing.lastActivity = album.created_at;
      }
    } else {
      userActivity.set(album.user_id, { count: 1, lastActivity: album.created_at });
    }
  });

  // Get top active user IDs
  const activeUserIds = Array.from(userActivity.entries())
    .sort((a, b) => {
      // Sort by count first, then by last activity
      if (b[1].count !== a[1].count) {
        return b[1].count - a[1].count;
      }
      return b[1].lastActivity.localeCompare(a[1].lastActivity);
    })
    .slice(0, limit)
    .map(([userId]) => userId);

  if (activeUserIds.length === 0) {
    return [];
  }

  // Fetch member profiles
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .in('id', activeUserIds)
    .not('nickname', 'is', null)
    .is('suspended_at', null);

  if (!members || members.length === 0) {
    return [];
  }

  // Map back to include activity data
  return members.map((member) => {
    const activity = userActivity.get(member.id);
    return {
      ...member,
      recent_activity_count: activity?.count || 0,
      last_activity_at: activity?.lastActivity || null,
    } as MemberWithActivity;
  }).sort((a, b) => {
    // Maintain sort order
    const aIndex = activeUserIds.indexOf(a.id);
    const bIndex = activeUserIds.indexOf(b.id);
    return aIndex - bIndex;
  });
}

/**
 * Get new members (recently joined)
 * Tagged with 'profiles' for cache invalidation
 */
export async function getNewMembers(limit = 12) {
  'use cache';
  cacheLife('max');
  cacheTag('profiles');

  const supabase = createPublicClient();

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url, created_at')
    .not('nickname', 'is', null)
    .is('suspended_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []) as MemberWithCreatedAt[];
}

/**
 * Get members by tag usage (top uploaders for popular tags)
 * Tagged with 'gallery' for cache invalidation
 */
export async function getMembersByTagUsage(limit = 12) {
  'use cache';
  cacheLife('max');
  cacheTag('gallery');

  const supabase = createPublicClient();

  // Get popular tags
  const { data: popularTags } = await supabase
    .from('tags')
    .select('name, count')
    .order('count', { ascending: false })
    .limit(10);

  if (!popularTags || popularTags.length === 0) {
    return [];
  }

  const tagNames = popularTags.map((t) => t.name);

  // Get photo tags for these popular tags
  const { data: photoTags } = await supabase
    .from('photo_tags')
    .select('photo_id, tag, photos!inner(user_id, is_public, deleted_at)')
    .in('tag', tagNames)
    .eq('photos.is_public', true)
    .is('photos.deleted_at', null);

  if (!photoTags || photoTags.length === 0) {
    return [];
  }

  // Count tag usage per user
  const userTagCounts = new Map<string, number>();
  type PhotoRow = Pick<Tables<'photos'>, 'user_id'>;
  type PhotoTagRow = Pick<Tables<'photo_tags'>, 'tag' | 'photo_id'>;
  type PhotoTagWithPhoto = PhotoTagRow & {
    photos: PhotoRow | null;
  };
  photoTags.forEach((pt: PhotoTagWithPhoto) => {
    const photo = pt.photos;
    if (photo?.user_id) {
      const current = userTagCounts.get(photo.user_id) || 0;
      userTagCounts.set(photo.user_id, current + 1);
    }
  });

  // Get top users by tag usage
  const topUserIds = Array.from(userTagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([userId]) => userId);

  if (topUserIds.length === 0) {
    return [];
  }

  // Fetch member profiles
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .in('id', topUserIds)
    .not('nickname', 'is', null)
    .is('suspended_at', null);

  return (members || []) as Member[];
}

/**
 * Get featured interests with member samples
 * Uses deterministic selection based on interest count to ensure cacheability
 * Tagged with 'interests' and 'profiles' for cache invalidation
 */
export async function getRandomInterestsWithMembers(interestLimit = 6, membersPerInterest = 3) {
  'use cache';
  cacheLife('max');
  cacheTag('interests');
  cacheTag('profiles');

  const supabase = createPublicClient();

  // Get top interests (deterministic - no randomization for cacheability)
  // We'll select every Nth interest to get variety while maintaining cache
  const { data: allInterests } = await supabase
    .from('interests')
    .select('*')
    .order('count', { ascending: false })
    .limit(interestLimit * 3); // Get more to select from

  if (!allInterests || allInterests.length === 0) {
    return [];
  }

  // Deterministic selection: take every Nth interest starting from index 1
  // This gives variety while maintaining cache consistency
  const step = Math.max(1, Math.floor(allInterests.length / interestLimit));
  const selectedInterests = allInterests.filter((_, index) => index % step === 1).slice(0, interestLimit);

  // For each interest, get sample members
  const results: InterestWithMembers[] = [];

  for (const interest of selectedInterests) {
    // Get profile IDs with this interest
    const { data: profileInterests } = await supabase
      .from('profile_interests')
      .select('profile_id')
      .eq('interest', interest.name)
      .limit(membersPerInterest * 2); // Get more to randomize

    if (!profileInterests || profileInterests.length === 0) {
      continue;
    }

    // Deterministic member selection: take first N members
    // This ensures cache consistency while still showing variety
    const selectedMemberIds = profileInterests.slice(0, membersPerInterest).map((pi) => pi.profile_id);

    // Fetch member profiles
    const { data: members } = await supabase
      .from('profiles')
      .select('id, full_name, nickname, avatar_url')
      .in('id', selectedMemberIds)
      .not('nickname', 'is', null)
      .is('suspended_at', null);

    if (members && members.length > 0) {
      results.push({
        interest: interest as Interest,
        members: members as Member[],
      });
    }
  }

  return results;
}

/**
 * Get members who frequently use a specific tag
 * Tagged with 'gallery' for cache invalidation
 */
export async function getMembersByTag(tagName: string) {
  'use cache';
  cacheLife('max');
  cacheTag('gallery');
  cacheTag(`tag-${tagName}`);

  const supabase = createPublicClient();

  // Get photo tags for this specific tag
  const { data: photoTags } = await supabase
    .from('photo_tags')
    .select('photo_id, photos!inner(user_id, is_public, deleted_at)')
    .eq('tag', tagName)
    .eq('photos.is_public', true)
    .is('photos.deleted_at', null);

  if (!photoTags || photoTags.length === 0) {
    return {
      members: [],
    };
  }

  // Count tag usage per user
  const userTagCounts = new Map<string, number>();
  type PhotoRow = Pick<Tables<'photos'>, 'user_id'>;
  type PhotoTagQueryResult = {
    photo_id: string;
    photos: PhotoRow | null;
  };
  photoTags.forEach((pt: PhotoTagQueryResult) => {
    const photo = pt.photos;
    if (photo?.user_id) {
      const current = userTagCounts.get(photo.user_id) || 0;
      userTagCounts.set(photo.user_id, current + 1);
    }
  });

  // Get user IDs sorted by usage count
  const userIds = Array.from(userTagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([userId]) => userId);

  if (userIds.length === 0) {
    return {
      members: [],
    };
  }

  // Fetch member profiles
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .in('id', userIds)
    .not('nickname', 'is', null)
    .is('suspended_at', null)
    .order('full_name', { ascending: true, nullsFirst: false })
    .order('nickname', { ascending: true });

  // Maintain sort order by tag usage
  const sortedMembers = (members || []).sort((a, b) => {
    const aCount = userTagCounts.get(a.id) || 0;
    const bCount = userTagCounts.get(b.id) || 0;
    if (bCount !== aCount) {
      return bCount - aCount;
    }
    // If counts are equal, sort alphabetically
    const aName = a.full_name || a.nickname || '';
    const bName = b.full_name || b.nickname || '';
    return aName.localeCompare(bName);
  });

  return {
    members: sortedMembers as Member[],
  };
}
