import PageContainer from '@/components/layout/PageContainer';
import InterestCloud from '@/components/shared/InterestCloud';
import MemberCard from '@/components/shared/MemberCard';
import { createMetadata } from '@/utils/metadata';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

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

export default async function InterestMembersPage({ params }: { params: Params }) {
  'use cache';
  cacheLife('max');
  cacheTag('interests');
  cacheTag('profiles');

  const resolvedParams = await params;
  const interestName = decodeURIComponent(resolvedParams?.interest || '');

  if (!interestName) {
    notFound();
  }

  const { interest, members } = await getMembersByInterest(interestName);

  if (!interest) {
    notFound();
  }

  // Get popular interests for sidebar
  const popularInterests = await getPopularInterests(20);

  return (
    <>
      <PageContainer>
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">
            Members interested in &ldquo;{interest.name}&rdquo;
          </h1>
          <p className="text-lg opacity-70">
            {members.length} {members.length === 1 ? 'member' : 'members'} with this interest
          </p>
        </div>

        {/* Popular interests sidebar */}
        {popularInterests.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">Browse by interest</h2>
            <InterestCloud interests={popularInterests} activeInterest={interest.name} />
          </div>
        )}

        {members.length === 0 ? (
          <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
            <p className="text-lg opacity-70">
              No members found with this interest yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}
