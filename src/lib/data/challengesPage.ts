import type { ChallengeWithStats } from '@/types/challenges';
import { cacheLife, cacheTag } from 'next/cache';

import { getActiveChallenges, getPastChallenges } from './challenges';

export type ChallengesPageData = {
  activeChallenges: ChallengeWithStats[];
  pastChallenges: ChallengeWithStats[];
  serverNow: number;
};

export async function getChallengesPageData(): Promise<ChallengesPageData> {
  'use cache';
  cacheLife('challengesPage');
  cacheTag('challenges-page');

  const [activeData, pastData] = await Promise.all([
    getActiveChallenges(),
    getPastChallenges(6),
  ]);

  return {
    activeChallenges: activeData.challenges,
    pastChallenges: pastData.challenges,
    serverNow: activeData.serverNow,
  };
}
