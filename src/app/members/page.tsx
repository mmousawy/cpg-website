import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import InterestCloud from '@/components/shared/InterestCloud';
import MemberCard from '@/components/shared/MemberCard';
import Tag from '@/components/shared/Tag';
import { createMetadata } from '@/utils/metadata';
import { getServerAuth } from '@/utils/supabase/getServerAuth';
import { formatJoinedDate } from '@/utils/utils';
import Link from 'next/link';

// Cached data functions
import { routes } from '@/config/routes';
import { getPopularTagsWithMemberCounts } from '@/lib/data/gallery';
import { getPopularInterests } from '@/lib/data/interests';
import { getNewMembers, getRandomInterestsWithMembers, getRecentlyActiveMembers } from '@/lib/data/members';

export const metadata = createMetadata({
  title: 'Discover members',
  description: 'Explore and connect with our community members. Find photographers by interests, recent activity, and photo styles.',
  canonical: '/members',
  keywords: ['photography community', 'photographers', 'member discovery', 'community members'],
});

export default async function MembersPage() {
  const { user } = await getServerAuth();

  // For unauthenticated users, show friendly login prompt
  if (!user) {
    return (
      <PageContainer>
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Discover our community</h1>
          <p className="text-lg opacity-70">
            Sign in to discover and connect with our community members
          </p>
        </div>

        <div className="rounded-xl border border-border-color bg-background-light p-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="size-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold">Join our community</h2>
          <p className="mb-6 text-foreground/70">
            Sign in to explore members by interests, discover photographers by their photo styles, and connect with recently active community members.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button href={`${routes.login.url}?redirectTo=/members`}>
              Log in
            </Button>
            <Button
              href={`${routes.signup.url}?redirectTo=/members`}
              variant="secondary"
            >
              Sign up
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  // For authenticated users, show discovery sections
  // All data functions are cached with appropriate tags
  const [popularInterests, recentlyActive, newMembers, randomInterests, popularTags] = await Promise.all([
    getPopularInterests(20),
    getRecentlyActiveMembers(12),
    getNewMembers(12),
    getRandomInterestsWithMembers(6, 3),
    getPopularTagsWithMemberCounts(20),
  ]);

  return (
    <>
      <PageContainer>
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Discover our community</h1>
          <p className="text-lg opacity-70">
            Explore members by interests, recent activity, and photo styles
          </p>
        </div>

        {/* Popular Interests Section */}
        {popularInterests.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-3 text-xl font-semibold">Popular interests</h2>
            <InterestCloud interests={popularInterests} />
          </div>
        )}

        {/* Random Interests with Members */}
        {randomInterests.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-1 text-lg font-semibold">Explore by interests</h2>
            <div className="space-y-8">
              {randomInterests.map(({ interest, members }) => (
                <div key={interest.id}>
                  <div className="mb-3 flex items-center justify-between">
                    <Link
                      href={`/members/interest/${encodeURIComponent(interest.name)}`}
                      className="text-lg font-medium hover:text-primary"
                    >
                      {interest.name}
                    </Link>
                    <Link
                      href={`/members/interest/${encodeURIComponent(interest.name)}`}
                      className="text-sm text-foreground/60 hover:text-primary"
                    >
                      View all ({interest.count || 0} members) →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {members.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Active Members */}
        {recentlyActive.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-1 text-lg font-semibold">Recently active</h2>
            <p className="mb-6 text-sm text-foreground/60">
              Members who have shared photos or albums recently
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {recentlyActive.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  badge={
                    member.recent_activity_count
                      ? `${member.recent_activity_count} ${member.recent_activity_count === 1 ? 'item' : 'items'} this month`
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Explore by Photo Style (Tags) */}
        {popularTags.length > 0 && (() => {
          // Calculate size based on memberCount relative to max (same logic as TagCloud)
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
            <div className="mb-10">
              <h2 className="mb-1 text-lg font-semibold">Explore by photo style</h2>
              <p className="mb-6 text-sm text-foreground/60">
                Discover members who frequently use these photo tags
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                {popularTags.map((tag) => {
                  const count = tag.memberCount || 0;
                  return (
                    <Link
                      key={tag.id}
                      href={`/members/tag/${encodeURIComponent(tag.name)}`}
                    >
                      <Tag
                        text={tag.name}
                        count={count}
                        size={getSize(count)}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* New Members */}
        {newMembers.length > 0 && (
          <div className="">
            <h2 className="mb-1 text-lg font-semibold">New members</h2>
            <p className="mb-6 text-sm text-foreground/60">
              Welcome our newest community members
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {newMembers.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  badge={member.created_at ? formatJoinedDate(member.created_at) : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
}
