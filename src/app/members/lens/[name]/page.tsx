import PageContainer from '@/components/layout/PageContainer';
import StickySectionHeading from '@/components/layout/StickySectionHeading';
import PageHeading from '@/components/layout/PageHeading';
import DailyDriverDiscoveryCloud from '@/components/members/DailyDriverDiscoveryCloud';
import MemberCard from '@/components/shared/MemberCard';
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import {
  getMembersByDailyDriverLens,
  getPopularDailyDriverLensGroups,
} from '@/lib/data/memberGear';
import { membersDailyDriverLensPath } from '@/lib/gear/memberGearPaths';
import { MIN_INDEXABLE_INTEREST_MEMBERS } from '@/lib/seoThresholds';
import { ensureStaticParams } from '@/lib/staticParams';
import { createMetadata } from '@/utils/metadata';
import { notFound } from 'next/navigation';

type Params = Promise<{ name: string }>;

export async function generateStaticParams() {
  const groups = await getPopularDailyDriverLensGroups(100);
  const params = groups.map((group) => ({
    name: encodeURIComponent(group.label),
  }));
  return ensureStaticParams(params, { name: 'sample' });
}

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  const nameParam = resolvedParams?.name || '';
  const includeTestContent = await getIncludeTestContent();
  const { label, members } = await getMembersByDailyDriverLens(nameParam, includeTestContent);

  if (!label) {
    return createMetadata({
      title: 'Lens not found',
      description: 'The requested lens could not be found',
    });
  }

  return createMetadata({
    title: `Members with daily driver lens "${label}"`,
    description: `Discover community members with daily driver lens "${label}".`,
    canonical: membersDailyDriverLensPath(label),
    keywords: ['photography community', 'photographers', label, 'lens', 'daily driver', 'member discovery'],
    noindex: members.length < MIN_INDEXABLE_INTEREST_MEMBERS,
  });
}

export const instant = false;

export default async function LensMembersPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const nameParam = resolvedParams?.name || '';

  if (!nameParam) {
    notFound();
  }

  const includeTestContent = await getIncludeTestContent();
  const [{ label, members }, popularLenses] = await Promise.all([
    getMembersByDailyDriverLens(nameParam, includeTestContent),
    getPopularDailyDriverLensGroups(20, includeTestContent),
  ]);

  if (!label || members.length === 0) {
    notFound();
  }

  return (
    <PageContainer>
      <PageHeading
        title={`Members with daily driver lens "${label}"`}
        description={
          <>
            {members.length}
            {' '}
            {members.length === 1 ? 'member' : 'members'}
            {' '}
            with this lens
          </>
        }
      />

      {popularLenses.length > 0 && (
        <div
          className="mb-8 sm:mb-10"
        >
          <StickySectionHeading
            stickyClassName="mb-3 sm:mb-3"
          >
            Browse by lens
          </StickySectionHeading>
          <DailyDriverDiscoveryCloud
            groups={popularLenses}
            kind="lens"
            activeLabel={label}
          />
        </div>
      )}

      <div
        className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
          />
        ))}
      </div>
    </PageContainer>
  );
}
