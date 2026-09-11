import { cacheLife, cacheTag } from 'next/cache';
import ChallengesList from '@/components/challenges/ChallengesList';
import PageContainer from '@/components/layout/PageContainer';
import ChallengesPageHeader from '@/app/challenges/ChallengesPageHeader';
import { getChallengesPageData } from '@/lib/data/challengesPage';
import { createMetadata } from '@/utils/metadata';

export const metadata = createMetadata({
  title: 'Photo challenges',
  description: 'Join our themed photo challenges! Submit your best shots, get featured, and showcase your creativity with the community.',
  canonical: '/challenges',
  keywords: ['photo challenges', 'photography contest', 'themed photography', 'photo submissions'],
});

export default async function ChallengesPage() {
  'use cache';
  cacheLife('challengesPage');
  cacheTag('challenges-page');

  const { activeChallenges, pastChallenges, serverNow } = await getChallengesPageData();

  return (
    <PageContainer>
      <ChallengesPageHeader />

      <div
        className="space-y-10"
      >
        <section>
          <h2
            className="text-xl font-semibold mb-4 font-heading opacity-80"
          >
            Active challenges
          </h2>
          <ChallengesList
            challenges={activeChallenges}
            emptyMessage="No active challenges right now. Check back soon!"
            serverNow={serverNow}
          />
        </section>

        {pastChallenges.length > 0 && (
          <section>
            <h2
              className="text-xl font-semibold mb-4 font-heading opacity-80"
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
