import type { Challenge } from '@/types/challenges';

type ChallengeLike = Pick<Challenge, 'is_active' | 'ends_at'>;

export function isChallengeActive(challenge: ChallengeLike, serverNow: number): boolean {
  if (!challenge.is_active) return false;
  if (!challenge.ends_at) return true;
  return new Date(challenge.ends_at).getTime() > serverNow;
}

export function filterActiveChallenges<T extends ChallengeLike>(
  challenges: T[],
  serverNow: number,
): T[] {
  return challenges.filter((c) => isChallengeActive(c, serverNow));
}

export function filterPastChallenges<T extends ChallengeLike>(
  challenges: T[],
  serverNow: number,
): T[] {
  return challenges.filter((c) => !isChallengeActive(c, serverNow));
}
