import ScrappyCameraIllustration from '@/components/gear/ScrappyCameraIllustration';
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
    title: `Members with daily driver "${label}"`,
    description: `Discover community members with daily driver "${label}".`,
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
        className="relative"
      >
        <PageHeading
          className="sm:pr-40"
          title={(
            <>
              <span
                className="sm:hidden text-xl"
              >
                Daily driver &ldquo;
                {label}
                &rdquo;
              </span>
              <span
                className="hidden sm:inline"
              >
                Members with daily driver &ldquo;
                {label}
                &rdquo;
              </span>
            </>
          )}
          description={(
            <div
              className="flex items-start gap-3 sm:block"
            >
              <div
                className="min-w-0 flex-1 space-y-1"
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
              <ScrappyCameraIllustration
                camera={label}
                className="h-16 w-auto max-w-[5.75rem] shrink-0 object-contain opacity-90 sm:hidden"
              />
            </div>
          )}
        />
        <ScrappyCameraIllustration
          camera={label}
          className="pointer-events-none absolute top-1 right-0 hidden h-24 w-auto max-w-36 object-contain opacity-90 sm:block"
        />

        {popularCameras.length > 0 && (
          <div
            className="mb-8 sm:mb-10"
          >
            <div
              className="max-sm:sticky max-sm:z-20 max-sm:-mx-3 max-sm:px-3 max-sm:py-2 max-sm:top-[calc(var(--sticky-page-heading-height,0px)-1px)] max-sm:backdrop-blur-sm max-sm:bg-background/80 max-sm:border-b max-sm:transition-[border-color] max-sm:border-transparent mb-2 sm:mb-4 mb-3 sm:mb-3"
            >
              <h2
                className="min-w-0 text-xl font-semibold font-heading"
              >
                Browse by camera body
              </h2>
            </div>
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
      </div>
    </PageContainer>
  );
}
