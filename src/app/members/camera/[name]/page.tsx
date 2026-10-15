import PageContainer from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';
import DailyDriverDiscoveryCloud from '@/components/members/DailyDriverDiscoveryCloud';
import MemberCard from '@/components/shared/MemberCard';
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import {
  getMembersByDailyDriverCamera,
  getPopularDailyDriverCameraGroups,
} from '@/lib/data/memberGear';
import { membersDailyDriverCameraPath } from '@/lib/gear/memberGearPaths';
import { MIN_INDEXABLE_INTEREST_MEMBERS } from '@/lib/seoThresholds';
import { ensureStaticParams } from '@/lib/staticParams';
import { createMetadata } from '@/utils/metadata';
import { notFound } from 'next/navigation';

type Params = Promise<{ name: string }>;

export async function generateStaticParams() {
  const groups = await getPopularDailyDriverCameraGroups(100);
  const params = groups.map((group) => ({
    name: encodeURIComponent(group.label),
  }));
  return ensureStaticParams(params, { name: 'sample' });
}

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  const nameParam = resolvedParams?.name || '';
  const includeTestContent = await getIncludeTestContent();
  const { label, members } = await getMembersByDailyDriverCamera(nameParam, includeTestContent);

  if (!label) {
    return createMetadata({
      title: 'Camera not found',
      description: 'The requested camera could not be found',
    });
  }

  return createMetadata({
    title: `Members whose daily driver is ${label}`,
    description: `Discover community members whose daily driver camera is ${label}.`,
    canonical: membersDailyDriverCameraPath(label),
    keywords: ['photography community', 'photographers', label, 'camera', 'daily driver', 'member discovery'],
    noindex: members.length < MIN_INDEXABLE_INTEREST_MEMBERS,
  });
}

export const instant = false;

export default async function CameraMembersPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const nameParam = resolvedParams?.name || '';

  if (!nameParam) {
    notFound();
  }

  const includeTestContent = await getIncludeTestContent();
  const [{ label, members }, popularCameras] = await Promise.all([
    getMembersByDailyDriverCamera(nameParam, includeTestContent),
    getPopularDailyDriverCameraGroups(20, includeTestContent),
  ]);

  if (!label || members.length === 0) {
    notFound();
  }

  return (
    <PageContainer>
      <PageHeading
        title={`Members whose daily driver is ${label}`}
        description={
          <>
            {members.length}
            {' '}
            {members.length === 1 ? 'member' : 'members'}
            {' '}
            with this camera body
          </>
        }
      />

      {popularCameras.length > 0 && (
        <div
          className="mb-8 sm:mb-10"
        >
          <h2
            className="mb-3 text-xl font-semibold font-heading"
          >
            Browse by camera body
          </h2>
          <DailyDriverDiscoveryCloud
            groups={popularCameras}
            kind="camera"
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
