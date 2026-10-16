import ChallengesPageHeader from '@/app/challenges/ChallengesPageHeader';
import ChallengesList from '@/components/challenges/ChallengesList';
import PageContainer from '@/components/layout/PageContainer';
import StickySectionHeading from '@/components/layout/StickySectionHeading';
import { getChallengesPageData } from '@/lib/data/challengesPage';
import { createMetadata } from '@/utils/metadata';
import { cacheLife, cacheTag } from 'next/cache';

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
          <StickySectionHeading>
            Active challenges
          </StickySectionHeading>
          <ChallengesList
            challenges={activeChallenges}
            emptyMessage="No active challenges right now. Check back soon!"
            serverNow={serverNow}
          />
        </section>

        {pastChallenges.length > 0 && (
          <section>
            <StickySectionHeading>
              Past challenges
            </StickySectionHeading>
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
