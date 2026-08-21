import PageContainer from '@/components/layout/PageContainer';

import InterestCloud from '@/components/shared/InterestCloud';
import MemberCard from '@/components/shared/MemberCard';
import EmptyState from '@/components/shared/EmptyState';
import { createMetadata } from '@/utils/metadata';
import { notFound } from 'next/navigation';
import HeroCommunitiesSVG from 'public/icons/hero-communities.svg';

// Cached data functions
import { getMembersByInterest, getPopularInterests } from '@/lib/data/interests';

type Params = Promise<{ interest: string }>;

// Pre-render all interest pages at build time
export async function generateStaticParams() {
  const popularInterests = await getPopularInterests(100);
  return popularInterests.map((interest) => ({ interest: encodeURIComponent(interest.name) }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  const interestName = decodeURIComponent(resolvedParams?.interest || '');

  if (!interestName) {
    return createMetadata({
      title: 'Interest Not Found',
      description: 'The requested interest could not be found',
    });
  }

  return createMetadata({
    title: `Members interested in "${interestName}"`,
    description: `Discover community members who share an interest in "${interestName}". Connect with photographers who have similar interests.`,
    canonical: `/members/interest/${encodeURIComponent(interestName)}`,
    keywords: ['photography community', 'photographers', interestName, 'member discovery'],
  });
}

// Block until cached data resolves so SSR includes full HTML (no streaming shell)
export const instant = false;

export default async function InterestMembersPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const interestName = decodeURIComponent(resolvedParams?.interest || '');

  if (!interestName) {
    notFound();
  }

  const [{ interest, members }, popularInterests] = await Promise.all([
    getMembersByInterest(interestName),
    getPopularInterests(20),
  ]);

  if (!interest) {
    notFound();
  }

  return (
    <>
      <PageContainer>
        <div
          className="mb-8"
        >
          <h1
            className="mb-2 text-3xl font-bold font-heading"
          >
            Members interested in &ldquo;
            {interest.name}
            &rdquo;
          </h1>
          <p
            className="text-lg opacity-70"
          >
            {members.length}
            {' '}
            {members.length === 1 ? 'member' : 'members'}
            {' '}
            with this interest
          </p>
        </div>

        {/* Popular interests sidebar */}
        {popularInterests.length > 0 && (
          <div
            className="mb-8 sm:mb-10"
          >
            <h2
              className="mb-3 text-xl font-semibold font-heading"
            >
              Browse by interest
            </h2>
            <InterestCloud
              interests={popularInterests}
              activeInterest={interest.name}
            />
          </div>
        )}

        {members.length === 0 ? (
          <EmptyState
            icon={<HeroCommunitiesSVG
              className="size-10 inline-block"
            />}
            title="No members found with this interest yet."
          />
        ) : (
          <div
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          >
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}
