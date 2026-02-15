import type {
  Challenge,
  ChallengePhoto,
  ChallengeWithStats,
  SubmissionForReview,
} from '@/types/challenges';
import { createPublicClient } from '@/utils/supabase/server';
import { cacheLife, cacheTag } from 'next/cache';

/**
 * Get all challenge slugs for static generation
 * Used in generateStaticParams to pre-render challenge pages
 * No caching needed - only called at build time
 */
export async function getAllChallengeSlugs() {
  const supabase = createPublicClient();

  const { data } = await supabase
    .from('challenges')
    .select('slug')
    .eq('is_active', true);

  return (data || []).map((c) => c.slug).filter((s): s is string => s !== null);
}

/**
 * Get active challenges (accepting submissions)
 * Tagged with 'challenges' for granular cache invalidation
 */
export async function getActiveChallenges() {
  'use cache';
  cacheLife('max');
  cacheTag('challenges');

  const supabase = createPublicClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from('challenges')
    .select('*')
    .eq('is_active', true)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order('starts_at', { ascending: false });

  // Get submission counts for each challenge
  const challenges = (data || []) as Challenge[];
  const challengesWithStats = await addSubmissionCounts(challenges);

  return {
    challenges: challengesWithStats,
    serverNow: Date.now(),
  };
}

/**
 * Get past challenges (ended or inactive)
 * Tagged with 'challenges' for granular cache invalidation
 */
export async function getPastChallenges(limit = 10) {
  'use cache';
  cacheLife('max');
  cacheTag('challenges');

  const supabase = createPublicClient();
  const now = new Date().toISOString();

  const { data, count } = await supabase
    .from('challenges')
    .select('*', { count: 'exact' })
    .or(`is_active.eq.false,ends_at.lt.${now}`)
    .order('ends_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  const challenges = (data || []) as Challenge[];
  const challengesWithStats = await addSubmissionCounts(challenges);

  return {
    challenges: challengesWithStats,
    totalCount: count || 0,
    serverNow: Date.now(),
  };
}

/**
 * Get all challenges for admin
 * Tagged with 'challenges' for granular cache invalidation
 */
export async function getAllChallenges() {
  'use cache';
  cacheLife('max');
  cacheTag('challenges');

  const supabase = createPublicClient();

  const { data } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });

  const challenges = (data || []) as Challenge[];
  const challengesWithStats = await addSubmissionCounts(challenges);

  return {
    challenges: challengesWithStats,
    serverNow: Date.now(),
  };
}

/**
 * Get a single challenge by slug
 * Tagged with 'challenges' for granular cache invalidation
 */
export async function getChallengeBySlug(slug: string) {
  'use cache';
  cacheLife('max');
  cacheTag('challenges');
  cacheTag(`challenge-${slug}`);

  const supabase = createPublicClient();

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!challenge) {
    return { challenge: null, serverNow: Date.now() };
  }

  // Get submission counts
  const { data: counts } = await supabase
    .from('challenge_submissions')
    .select('status')
    .eq('challenge_id', challenge.id);

  const submissionCounts = (counts || []).reduce(
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
    challenge: {
      ...challenge,
      submission_count: submissionCounts.total,
      accepted_count: submissionCounts.accepted,
      pending_count: submissionCounts.pending,
      rejected_count: submissionCounts.rejected,
      creator: creator || undefined,
    } as ChallengeWithStats,
    serverNow: Date.now(),
  };
}

/**
 * Get accepted photos for a challenge (for gallery display)
 * Tagged with 'challenge-photos' for granular cache invalidation
 */
export async function getChallengePhotos(challengeId: string) {
  'use cache';
  cacheLife('max');
  cacheTag('challenge-photos');
  cacheTag(`challenge-photos-${challengeId}`);

  const supabase = createPublicClient();

  const { data } = await supabase
    .from('challenge_photos')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('reviewed_at', { ascending: false });

  return (data || []) as ChallengePhoto[];
}

/**
 * Get contributors (unique users with accepted photos) for a challenge,
 * ordered by who submitted first.
 * Tagged with 'challenge-photos' for granular cache invalidation
 */
export async function getChallengeContributors(challengeId: string) {
  'use cache';
  cacheLife('max');
  cacheTag('challenge-photos');

  const supabase = createPublicClient();

  // Get accepted submissions ordered by submitted_at (first submitter first)
  const { data: submissions } = await supabase
    .from('challenge_submissions')
    .select('user_id, submitted_at')
    .eq('challenge_id', challengeId)
    .eq('status', 'accepted')
    .order('submitted_at', { ascending: true });

  if (!submissions || submissions.length === 0) {
    return [];
  }

  // Dedupe by user_id while preserving order of first submission
  const orderedUserIds: string[] = [];
  const seen = new Set<string>();
  for (const s of submissions) {
    if (!seen.has(s.user_id)) {
      seen.add(s.user_id);
      orderedUserIds.push(s.user_id);
    }
  }

  // Get profile info for contributors
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, full_name')
    .in('id', orderedUserIds);

  if (!profiles || profiles.length === 0) return [];

  // Build a map for lookup, then return in submission order
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  return orderedUserIds
    .map((id) => profileMap.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => ({
      user_id: p.id,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      full_name: p.full_name,
    }));
}

/**
 * Helper function to add submission counts and contributors to challenges
 */
async function addSubmissionCounts(
  challenges: Challenge[],
): Promise<ChallengeWithStats[]> {
  if (challenges.length === 0) return [];

  const supabase = createPublicClient();
  const challengeIds = challenges.map((c) => c.id);

  // Get all submissions for these challenges (including user_id for contributors)
  const { data: allSubmissions } = await supabase
    .from('challenge_submissions')
    .select('challenge_id, status, user_id')
    .in('challenge_id', challengeIds);

  // Count submissions per challenge and collect unique accepted user IDs
  const statsMap: Record<string, {
    total: number;
    accepted: number;
    pending: number;
    acceptedUserIds: Set<string>;
  }> = {};

  for (const sub of allSubmissions || []) {
    if (!statsMap[sub.challenge_id]) {
      statsMap[sub.challenge_id] = { total: 0, accepted: 0, pending: 0, acceptedUserIds: new Set() };
    }
    statsMap[sub.challenge_id].total++;
    if (sub.status === 'accepted') {
      statsMap[sub.challenge_id].accepted++;
      statsMap[sub.challenge_id].acceptedUserIds.add(sub.user_id);
    }
    if (sub.status === 'pending') statsMap[sub.challenge_id].pending++;
  }

  // Collect all unique user IDs from accepted submissions
  const allUserIds = new Set<string>();
  Object.values(statsMap).forEach((s) => s.acceptedUserIds.forEach((id) => allUserIds.add(id)));

  // Fetch profile info for all contributors in one query
  let profilesMap: Map<string, { id: string; nickname: string | null; full_name: string | null; avatar_url: string | null }> = new Map();
  if (allUserIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, full_name, avatar_url')
      .in('id', Array.from(allUserIds));

    for (const p of profiles || []) {
      profilesMap.set(p.id, { id: p.id, nickname: p.nickname, full_name: p.full_name, avatar_url: p.avatar_url });
    }
  }

  return challenges.map((challenge) => {
    const stats = statsMap[challenge.id];
    const contributors = stats
      ? Array.from(stats.acceptedUserIds)
        .map((id) => profilesMap.get(id))
        .filter((p): p is { id: string; nickname: string | null; full_name: string | null; avatar_url: string | null } => !!p)
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
 * Get submissions for review (admin)
 * Not cached - admin pages should see real-time data
 */
export async function getSubmissionsForReview(
  challengeId: string,
  status: 'pending' | 'accepted' | 'rejected' = 'pending',
) {
  const supabase = createPublicClient();

  const { data } = await supabase
    .from('challenge_submissions')
    .select(
      `
      *,
      photo:photos (id, short_id, url, width, height, title, blurhash),
      user:profiles!challenge_submissions_user_id_fkey (id, nickname, full_name, avatar_url)
    `,
    )
    .eq('challenge_id', challengeId)
    .eq('status', status)
    .order('submitted_at', { ascending: status === 'pending' }); // Oldest first for pending

  return (data || []) as SubmissionForReview[];
}
