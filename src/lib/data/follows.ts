import type { FollowListMember, FollowListType } from '@/types/follows';
import { createAdminClient } from '@/utils/supabase/admin';

type FollowProfileRow = {
  id: string;
  nickname: string | null;
  full_name: string | null;
  avatar_url: string | null;
  suspended_at: string | null;
  deletion_scheduled_at: string | null;
};

function isActiveProfile(profile: FollowProfileRow | null | undefined): profile is FollowProfileRow {
  return !!profile && !profile.suspended_at && !profile.deletion_scheduled_at;
}

type FollowRow = {
  created_at: string;
  follower?: FollowProfileRow | null;
  /** Avoid `following` alias — it conflicts with PostgREST/SQL reserved wording */
  followed?: FollowProfileRow | null;
};

function getProfileFromRow(row: FollowRow, type: FollowListType): FollowProfileRow | null {
  return type === 'followers' ? row.follower ?? null : row.followed ?? null;
}

function toFollowListMember(profile: FollowProfileRow): FollowListMember {
  return {
    id: profile.id,
    nickname: profile.nickname,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
  };
}

/**
 * Follow counts/lists use the service-role client because profile pages are cached
 * with an anonymous Supabase client (no session). The follows SELECT RLS policy
 * only exposes rows to involved users, so anon reads always return empty.
 */
function createFollowsClient() {
  return createAdminClient();
}

async function countActiveFollows(profileId: string, type: FollowListType): Promise<number> {
  const supabase = createFollowsClient();

  if (type === 'followers') {
    const { data, error } = await supabase
      .from('follows')
      .select('follower:profiles!follows_follower_id_fkey(suspended_at, deletion_scheduled_at)')
      .eq('following_id', profileId);

    if (error) {
      console.error('Error counting followers:', error);
      return 0;
    }

    return (data || []).filter((row) => isActiveProfile(row.follower as FollowProfileRow | null)).length;
  }

  const { data, error } = await supabase
    .from('follows')
    .select('followed:profiles!follows_following_id_fkey(suspended_at, deletion_scheduled_at)')
    .eq('follower_id', profileId);

  if (error) {
    console.error('Error counting following:', error);
    return 0;
  }

  return (data || []).filter((row) => isActiveProfile(row.followed as FollowProfileRow | null)).length;
}

/**
 * Live follower/following counts for a profile (active members only).
 *
 * Not wrapped in `'use cache'`: that cache is in-memory per instance, so
 * `expireTag` on the follow API instance does not refresh counts on the
 * instance that serves the next profile GET (Vercel preview/production).
 */
export async function getProfileFollowCounts(userId: string) {
  const [followerCount, followingCount] = await Promise.all([
    countActiveFollows(userId, 'followers'),
    countActiveFollows(userId, 'following'),
  ]);

  return { followerCount, followingCount };
}

type GetFollowListOptions = {
  profileId: string;
  type: FollowListType;
  offset: number;
  limit: number;
  query?: string;
};

/**
 * Paginated followers or following list with optional name search.
 */
export async function getFollowList({
  profileId,
  type,
  offset,
  limit,
  query,
}: GetFollowListOptions): Promise<{
  members: FollowListMember[];
  totalCount: number;
  hasMore: boolean;
}> {
  const supabase = createFollowsClient();
  const trimmedQuery = query?.trim();
  const hasSearch = !!trimmedQuery && trimmedQuery.length >= 2;
  const searchTerm = hasSearch ? trimmedQuery.toLowerCase() : '';

  const { data, error } = type === 'followers'
    ? await supabase
      .from('follows')
      .select(`
        created_at,
        follower:profiles!follows_follower_id_fkey!inner(id, nickname, full_name, avatar_url, suspended_at, deletion_scheduled_at)
      `)
      .eq('following_id', profileId)
      .order('created_at', { ascending: false })
    : await supabase
      .from('follows')
      .select(`
        created_at,
        followed:profiles!follows_following_id_fkey!inner(id, nickname, full_name, avatar_url, suspended_at, deletion_scheduled_at)
      `)
      .eq('follower_id', profileId)
      .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching ${type} list:`, error);
    return { members: [], totalCount: 0, hasMore: false };
  }

  const activeRows = ((data || []) as FollowRow[]).filter((row) => {
    const profile = getProfileFromRow(row, type);
    if (!isActiveProfile(profile)) {
      return false;
    }
    if (!hasSearch) {
      return true;
    }
    const nickname = profile.nickname?.toLowerCase() ?? '';
    const fullName = profile.full_name?.toLowerCase() ?? '';
    return nickname.includes(searchTerm) || fullName.includes(searchTerm);
  });

  const totalCount = activeRows.length;
  const page = activeRows
    .slice(offset, offset + limit)
    .map((row) => toFollowListMember(getProfileFromRow(row, type)!));

  return {
    members: page,
    totalCount,
    hasMore: offset + limit < totalCount,
  };
}
