import PageContainer from '@/components/layout/PageContainer';
import MemberCard from '@/components/shared/MemberCard';
import Tag from '@/components/shared/Tag';
import { createMetadata } from '@/utils/metadata';
import { cacheLife, cacheTag } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// Cached data functions
import { getPopularTagsWithMemberCounts } from '@/lib/data/gallery';
import { getMembersByTag } from '@/lib/data/members';

type Params = Promise<{ tag: string }>;

// Pre-render all tag pages at build time
export async function generateStaticParams() {
  const popularTags = await getPopularTagsWithMemberCounts(100);
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

  // Get popular tags with member counts (same as members page)
  const popularTags = await getPopularTagsWithMemberCounts(20);

  // Calculate size based on memberCount relative to max (same logic as members page)
  const maxCount = Math.max(...popularTags.map((t) => t.memberCount || 0));
  const minCount = Math.min(...popularTags.map((t) => t.memberCount || 0));
  const range = maxCount - minCount || 1;

  function getSize(count: number): 'xs' | 'sm' | 'base' | 'lg' {
    const normalized = (count - minCount) / range;

    if (normalized > 0.8) return 'lg';
    if (normalized > 0.6) return 'base';
    if (normalized > 0.3) return 'sm';
    return 'xs';
  }

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

        {/* Explore by Photo Style (Tags) */}
        {popularTags.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-1 text-lg font-semibold">Explore by photo style</h2>
            <p className="mb-6 text-sm text-foreground/60">
              Discover members who frequently use these photo tags
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              {popularTags.map((tag) => {
                const count = tag.memberCount || 0;
                const isActive = tag.name.toLowerCase() === tagName.toLowerCase();
                return (
                  <Link
                    key={tag.id}
                    href={`/members/tag/${encodeURIComponent(tag.name)}`}
                  >
                    <Tag
                      text={tag.name}
                      count={count}
                      size={getSize(count)}
                      isActive={isActive}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {members.length === 0 ? (
          <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
            <p className="text-lg opacity-70">
              No members found using this tag yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
