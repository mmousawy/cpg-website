import { cacheLife, cacheTag } from 'next/cache';

import ChallengesList from '@/components/challenges/ChallengesList';
import PageContainer from '@/components/layout/PageContainer';
import HelpLink from '@/components/shared/HelpLink';
import { createMetadata } from '@/utils/metadata';

// Cached data functions
import { getActiveChallenges, getPastChallenges } from '@/lib/data/challenges';

export const metadata = createMetadata({
  title: 'Photography Challenges',
  description: 'Join our themed photo challenges! Submit your best shots, get featured, and showcase your creativity with the community.',
  canonical: '/challenges',
  keywords: ['photo challenges', 'photography contest', 'themed photography', 'photo submissions'],
});

export default async function ChallengesPage() {
  'use cache';
  cacheLife('max');
  cacheTag('challenges');

  // Fetch challenges using cached data functions
  const [activeData, pastData] = await Promise.all([
    getActiveChallenges(),
    getPastChallenges(6),
  ]);

  const { challenges: activeChallenges, serverNow } = activeData;
  const { challenges: pastChallenges } = pastData;

  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <div
          className="flex items-center gap-2 mb-2"
        >
          <h1
            className="text-2xl sm:text-3xl font-bold"
          >
            Photography challenges
          </h1>
          <HelpLink
            href="how-challenges-work"
            label="How photo challenges work"
          />
        </div>
        <p
          className="text-base sm:text-lg mt-2 text-foreground/70"
        >
          Join our themed challenges and showcase your photography skills
        </p>
      </div>

      <div
        className="space-y-10"
      >
        {/* Active Challenges */}
        <section>
          <h2
            className="text-lg font-semibold mb-4 opacity-70"
          >
            Active challenges
          </h2>
          <ChallengesList
            challenges={activeChallenges}
            emptyMessage="No active challenges right now. Check back soon!"
            serverNow={serverNow}
          />
        </section>

        {/* Past Challenges */}
        {pastChallenges.length > 0 && (
          <section>
            <h2
              className="text-lg font-semibold mb-4"
            >
              Past challenges
            </h2>
            <ChallengesList
              challenges={pastChallenges}
              emptyMessage="No past challenges yet."
              serverNow={serverNow}
              isPast
            />
          </section>
        )}
      </div>
    </PageContainer>
  );
}
