import PageContainer from '@/components/layout/PageContainer';
import MemberCard from '@/components/shared/MemberCard';
import PopularTagsSection from '@/components/shared/PopularTagsSection';
import { createMetadata } from '@/utils/metadata';
import { notFound } from 'next/navigation';
import { cacheLife, cacheTag } from 'next/cache';

// Cached data functions
import { getPopularTags } from '@/lib/data/gallery';
import { getMembersByTag } from '@/lib/data/members';

type Params = Promise<{ tag: string }>;

// Pre-render all tag pages at build time
export async function generateStaticParams() {
  const popularTags = await getPopularTags(100);
  return popularTags.map((tag) => ({ tag: encodeURIComponent(tag.name) }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  const tagName = decodeURIComponent(resolvedParams?.tag || '');

  if (!tagName) {
    return createMetadata({
      title: 'Tag Not Found',
      description: 'The requested tag could not be found',
    });
  }

  return createMetadata({
    title: `Members using "${tagName}" tag`,
    description: `Discover community members who frequently use the "${tagName}" tag in their photos. Connect with photographers who share your photo style.`,
    canonical: `/members/tag/${encodeURIComponent(tagName)}`,
    keywords: ['photography community', 'photographers', tagName, 'photo tags', 'member discovery'],
  });
}

export default async function TagMembersPage({ params }: { params: Params }) {
  'use cache';
  cacheLife('max');
  cacheTag('gallery');
  cacheTag('profiles');

  const resolvedParams = await params;
  const tagName = decodeURIComponent(resolvedParams?.tag || '');

  if (!tagName) {
    notFound();
  }

  const { members } = await getMembersByTag(tagName);

  // Get popular tags for sidebar
  const popularTags = await getPopularTags(20);

  return (
    <>
      <PageContainer>
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">
            Members using &ldquo;{tagName}&rdquo; tag
          </h1>
          <p className="text-lg opacity-70">
            {members.length} {members.length === 1 ? 'member' : 'members'} frequently use this tag
          </p>
        </div>

        <PopularTagsSection activeTag={tagName} />

        {members.length === 0 ? (
          <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
            <p className="text-lg opacity-70">
              No members found using this tag yet.
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
