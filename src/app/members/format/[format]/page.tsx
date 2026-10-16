import PageContainer from '@/components/layout/PageContainer';
import StickySectionHeading from '@/components/layout/StickySectionHeading';
import PageHeading from '@/components/layout/PageHeading';
import ShootingFormatDiscoveryCloud from '@/components/members/ShootingFormatDiscoveryCloud';
import MemberCard from '@/components/shared/MemberCard';
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import {
  getMembersByShootingFormat,
  getPopularShootingFormatGroups,
} from '@/lib/data/memberGear';
import { MIN_INDEXABLE_INTEREST_MEMBERS } from '@/lib/seoThresholds';
import { ensureStaticParams } from '@/lib/staticParams';
import { createMetadata } from '@/utils/metadata';
import { notFound } from 'next/navigation';

type Params = Promise<{ format: string }>;

export async function generateStaticParams() {
  const groups = await getPopularShootingFormatGroups(100);
  const params = groups.map((group) => ({
    format: group.key,
  }));
  return ensureStaticParams(params, { format: 'digital' });
}

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  const formatSlug = decodeURIComponent(resolvedParams?.format || '');
  const includeTestContent = await getIncludeTestContent();
  const { format, label, members } = await getMembersByShootingFormat(formatSlug, includeTestContent);

  if (!format) {
    return createMetadata({
      title: 'Format not found',
      description: 'The requested shooting format could not be found',
    });
  }

  return createMetadata({
    title: `Members who shoot on ${label}`,
    description: `Discover community members who shoot on ${label}. Connect with photographers who use the same format.`,
    canonical: `/members/format/${encodeURIComponent(format)}`,
    keywords: ['photography community', 'photographers', label, 'shooting format', 'member discovery'],
    noindex: members.length < MIN_INDEXABLE_INTEREST_MEMBERS,
  });
}

export const instant = false;

export default async function FormatMembersPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const formatSlug = decodeURIComponent(resolvedParams?.format || '');

  if (!formatSlug) {
    notFound();
  }

  const includeTestContent = await getIncludeTestContent();
  const [{ format, label, members }, popularFormats] = await Promise.all([
    getMembersByShootingFormat(formatSlug, includeTestContent),
    getPopularShootingFormatGroups(20, includeTestContent),
  ]);

  if (!format || members.length === 0) {
    notFound();
  }

  return (
    <PageContainer>
      <PageHeading
        title={`Members who shoot on ${label}`}
        description={
          <>
            {members.length}
            {' '}
            {members.length === 1 ? 'member' : 'members'}
            {' '}
            with this format
          </>
        }
      />

      {popularFormats.length > 0 && (
        <div
          className="mb-8 sm:mb-10"
        >
          <StickySectionHeading
            stickyClassName="mb-3 sm:mb-3"
          >
            Browse by format
          </StickySectionHeading>
          <ShootingFormatDiscoveryCloud
            groups={popularFormats}
            activeFormat={format}
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
