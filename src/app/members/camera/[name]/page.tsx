import ScrappyCameraIllustration from '@/components/gear/ScrappyCameraIllustration';
import PageContainer from '@/components/layout/PageContainer';
import StickySectionHeading from '@/components/layout/StickySectionHeading';
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
    title: `Members whose daily driver is "${label}"`,
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

  const memberCountLine = (
    <>
      {members.length}
      {' '}
      {members.length === 1 ? 'member' : 'members'}
      {' '}
      with this camera body
    </>
  );

  return (
    <PageContainer>
      <div
        className="mb-8 flex items-start gap-3 sm:mb-10 sm:gap-5"
      >
        <PageHeading
          className="mb-0! min-w-0 flex-1"
          title={(
            <>
              <span
                className="sm:hidden"
              >
                Daily driver
              </span>
              <span
                className="hidden sm:inline"
              >
                Members whose daily driver is &ldquo;
                {label}
                &rdquo;
              </span>
            </>
          )}
          description={(
            <div
              className="min-w-0 space-y-1"
            >
              <span
                className="block truncate font-medium text-foreground sm:hidden"
                title={label}
              >
                {label}
              </span>
              <span
                className="block text-foreground/80"
              >
                {memberCountLine}
              </span>
            </div>
          )}
        />
        <ScrappyCameraIllustration
          camera={label}
          className="mt-0.5 h-16 w-auto max-w-[5.75rem] shrink-0 object-contain opacity-90 sm:mt-1 sm:h-24 sm:max-w-36"
        />
      </div>

      {popularCameras.length > 0 && (
        <div
          className="mb-8 sm:mb-10"
        >
          <StickySectionHeading
            stickyClassName="mb-3 sm:mb-3"
          >
            Browse by camera body
          </StickySectionHeading>
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
