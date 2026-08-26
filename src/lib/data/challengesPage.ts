import type { ChallengeWithStats } from '@/types/challenges';

import { getActiveChallenges, getPastChallenges } from './challenges';

export type ChallengesPageData = {
  activeChallenges: ChallengeWithStats[];
  pastChallenges: ChallengeWithStats[];
  serverNow: number;
};

export async function getChallengesPageData(): Promise<ChallengesPageData> {
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
