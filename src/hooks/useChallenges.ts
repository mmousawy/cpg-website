import type {
  Challenge,
  ChallengePhoto,
  ChallengeWithStats,
} from '@/types/challenges';
import { supabase } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';

/**
 * Fetch active challenges (accepting submissions)
 */
async function fetchActiveChallenges(): Promise<ChallengeWithStats[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('is_active', true)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order('starts_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch active challenges');
  }

  const challenges = (data || []) as Challenge[];

  const challengeIds = challenges.map((c) => c.id);
  if (challengeIds.length === 0) return [];

  const { data: submissions } = await supabase
    .from('challenge_submissions')
    .select('challenge_id, status, user_id')
    .in('challenge_id', challengeIds);

  const statsMap: Record<string, {
    total: number;
    accepted: number;
    pending: number;
    acceptedUserIds: Set<string>;
  }> = {};

  for (const sub of submissions || []) {
    if (!statsMap[sub.challenge_id]) {
      statsMap[sub.challenge_id] = {
        total: 0,
        accepted: 0,
        pending: 0,
        acceptedUserIds: new Set(),
      };
    }
    statsMap[sub.challenge_id].total++;
    if (sub.status === 'accepted') {
      statsMap[sub.challenge_id].accepted++;
      statsMap[sub.challenge_id].acceptedUserIds.add(sub.user_id);
    }
    if (sub.status === 'pending') statsMap[sub.challenge_id].pending++;
  }

  const allUserIds = new Set<string>();
  for (const stats of Object.values(statsMap)) {
    for (const id of stats.acceptedUserIds) {
      allUserIds.add(id);
    }
  }

  const profilesMap = new Map<string, {
    id: string;
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }>();

  if (allUserIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, full_name, avatar_url, suspended_at, deletion_scheduled_at')
      .in('id', Array.from(allUserIds));

    for (const profile of profiles || []) {
      if (!profile.suspended_at && !profile.deletion_scheduled_at) {
        profilesMap.set(profile.id, {
          id: profile.id,
          nickname: profile.nickname,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        });
      }
    }
  }

  return challenges.map((challenge) => {
    const stats = statsMap[challenge.id];
    const contributors = stats
      ? Array.from(stats.acceptedUserIds)
        .map((id) => profilesMap.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p)
      : [];

    return {
      ...challenge,
      submission_count: stats?.total || 0,
      accepted_count: stats?.accepted || 0,
      pending_count: stats?.pending || 0,
      contributors,
    };
  });
}

/**
 * Hook to fetch active challenges
 */
export function useActiveChallenges() {
  return useQuery({
    queryKey: ['challenges', 'active'],
    queryFn: fetchActiveChallenges,
  });
}

/**
 * Fetch a single challenge by slug
 */
async function fetchChallengeBySlug(slug: string): Promise<ChallengeWithStats | null> {
  const { data: challenge, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message || 'Failed to fetch challenge');
  }

  if (!challenge) return null;

  // Get submission counts
  const { data: submissions } = await supabase
    .from('challenge_submissions')
    .select('status')
    .eq('challenge_id', challenge.id);

  const counts = (submissions || []).reduce(
    (acc, sub) => {
      acc.total++;
      if (sub.status === 'accepted') acc.accepted++;
      if (sub.status === 'pending') acc.pending++;
      if (sub.status === 'rejected') acc.rejected++;
      return acc;
    },
    { total: 0, accepted: 0, pending: 0, rejected: 0 },
  );

  // Get creator info
  const { data: creator } = await supabase
    .from('profiles')
    .select('nickname, full_name, avatar_url')
    .eq('id', challenge.created_by)
    .single();

  return {
    ...(challenge as Challenge),
    submission_count: counts.total,
    accepted_count: counts.accepted,
    pending_count: counts.pending,
    rejected_count: counts.rejected,
    creator: creator || undefined,
  };
}

/**
 * Hook to fetch a challenge by slug
 */
export function useChallengeBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['challenge', slug],
    queryFn: () => fetchChallengeBySlug(slug!),
    enabled: !!slug,
  });
}

/**
 * Fetch accepted photos for a challenge
 */
async function fetchChallengePhotos(challengeId: string): Promise<ChallengePhoto[]> {
  const { data, error } = await supabase
    .from('challenge_photos')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('reviewed_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch challenge photos');
  }

  return (data || []) as ChallengePhoto[];
}

/**
 * Hook to fetch accepted photos for a challenge
 */
export function useChallengePhotos(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenge-photos', challengeId],
    queryFn: () => fetchChallengePhotos(challengeId!),
    enabled: !!challengeId,
  });
}

/**
 * Fetch contributors for a challenge
 */
async function fetchChallengeContributors(challengeId: string) {
  // Get unique user IDs from accepted submissions
  const { data: submissions } = await supabase
    .from('challenge_submissions')
    .select('user_id')
    .eq('challenge_id', challengeId)
    .eq('status', 'accepted');

  if (!submissions || submissions.length === 0) return [];

  const uniqueUserIds = [...new Set(submissions.map((s) => s.user_id))];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, full_name, suspended_at, deletion_scheduled_at')
    .in('id', uniqueUserIds);

  return (profiles || [])
    .filter((p) => !p.suspended_at && !p.deletion_scheduled_at)
    .map((p) => ({
      user_id: p.id,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      full_name: p.full_name,
    }));
}

/**
 * Hook to fetch contributors for a challenge
 */
export function useChallengeContributors(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenge-contributors', challengeId],
    queryFn: () => fetchChallengeContributors(challengeId!),
    enabled: !!challengeId,
  });
}

/**
 * Fetch all challenges for admin
 */
async function fetchAllChallenges(): Promise<ChallengeWithStats[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch challenges');
  }

  const challenges = (data || []) as Challenge[];
  const challengeIds = challenges.map((c) => c.id);

  if (challengeIds.length === 0) return [];

  const { data: submissions } = await supabase
    .from('challenge_submissions')
    .select('challenge_id, status')
    .in('challenge_id', challengeIds);

  const countsMap = (submissions || []).reduce(
    (acc, sub) => {
      if (!acc[sub.challenge_id]) {
        acc[sub.challenge_id] = { total: 0, accepted: 0, pending: 0 };
      }
      acc[sub.challenge_id].total++;
      if (sub.status === 'accepted') acc[sub.challenge_id].accepted++;
      if (sub.status === 'pending') acc[sub.challenge_id].pending++;
      return acc;
    },
    {} as Record<string, { total: number; accepted: number; pending: number }>,
  );

  return challenges.map((challenge) => ({
    ...challenge,
    submission_count: countsMap[challenge.id]?.total || 0,
    accepted_count: countsMap[challenge.id]?.accepted || 0,
    pending_count: countsMap[challenge.id]?.pending || 0,
  }));
}

/**
 * Hook to fetch all challenges (admin)
 */
export function useAllChallenges() {
  return useQuery({
    queryKey: ['challenges', 'all'],
    queryFn: fetchAllChallenges,
  });
}
