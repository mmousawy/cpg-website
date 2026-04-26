import Avatar from '@/components/auth/Avatar';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import HelpLink from '@/components/shared/HelpLink';
import InterestCloud from '@/components/shared/InterestCloud';
import MemberCard from '@/components/shared/MemberCard';
import Tag from '@/components/shared/Tag';
import { createMetadata } from '@/utils/metadata';
import { getServerAuth } from '@/utils/supabase/getServerAuth';
import { formatJoinedDate } from '@/utils/utils';
import Link from 'next/link';
import { Suspense } from 'react';

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

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ user }, resolvedSearchParams] = await Promise.all([getServerAuth(), searchParams]);
  const showSkeleton = resolvedSearchParams.skeleton !== undefined;

  // For unauthenticated users, show friendly login prompt
  if (!user) {
    return (
      <PageContainer>
        <div
          className="mb-8"
        >
          <div
            className="flex items-center gap-2 mb-2"
          >
            <h1
              className="text-2xl sm:text-3xl font-bold"
            >
              Discover our community
            </h1>
            <HelpLink
              href="discover-members"
              label="Help with discovering members"
              size="lg"
            />
          </div>
          <p
            className="text-base sm:text-lg opacity-70"
          >
            Sign in to discover and connect with our community members
          </p>
        </div>

        <div
          className="rounded-xl border border-border-color bg-background-light p-8 text-center"
        >
          <div
            className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10"
          >
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
          <h2
            className="mb-2 text-xl font-semibold"
          >
            Join our community
          </h2>
          <p
            className="mb-6 text-foreground/70"
          >
            Sign in to explore members by interests, discover photographers by their photo styles, and connect with recently active community members.
          </p>
          <div
            className="flex flex-wrap justify-center gap-3"
          >
            <Button
              href={`${routes.login.url}?redirectTo=/members`}
            >
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
  // Wrap each section in Suspense to prevent hydration errors
  return (
    <>
      <PageContainer>
        <div
          className="mb-8"
        >
          <div
            className="flex items-center gap-2 mb-2"
          >
            <h1
              className="text-2xl sm:text-3xl font-bold"
            >
              Discover our community
            </h1>
            <HelpLink
              href="discover-members"
              label="Help with discovering members"
              size="lg"
            />
          </div>
          <p
            className="text-base sm:text-lg opacity-70"
          >
            Explore members by interests, recent activity, and photo styles
          </p>
        </div>

        {/* Popular Interests Section */}
        <div
          className="mb-10"
        >
          <h2
            className="mb-3 text-xl font-semibold"
          >
            Popular interests
          </h2>
          {showSkeleton ? <InterestsSkeleton /> : (
            <Suspense
              fallback={<InterestsSkeleton />}
            >
              <PopularInterestsSection />
            </Suspense>
          )}
        </div>

        {/* Random Interests with Members */}
        <div
          className="mb-10"
        >
          <h2
            className="mb-4 text-xl font-semibold"
          >
            Explore by interests
          </h2>
          {showSkeleton ? <InterestCardsSkeleton /> : (
            <Suspense
              fallback={<InterestCardsSkeleton />}
            >
              <RandomInterestsSection />
            </Suspense>
          )}
        </div>

        {/* Recently Active Members */}
        <div
          className="mb-10"
        >
          <h2
            className="mb-1 text-lg font-semibold"
          >
            Recently active
          </h2>
          <p
            className="mb-6 text-sm text-foreground/60"
          >
            Members who have shared photos or albums recently
          </p>
          {showSkeleton
            ? (
              <MemberGridSkeleton
                count={12}
              />
            )
            : (
              <Suspense
                fallback={(
                  <MemberGridSkeleton
                    count={12}
                  />
                )}
              >
                <RecentlyActiveSection />
              </Suspense>
            )}
        </div>

        {/* Explore by Photo Style (Tags) */}
        <div
          className="mb-10"
        >
          <h2
            className="mb-1 text-lg font-semibold"
          >
            Explore by photo style
          </h2>
          <p
            className="mb-6 text-sm text-foreground/60"
          >
            Discover members who frequently use these photo tags
          </p>
          {showSkeleton ? <InterestsSkeleton /> : (
            <Suspense
              fallback={<InterestsSkeleton />}
            >
              <PopularTagsSection />
            </Suspense>
          )}
        </div>

        {/* New Members */}
        <div>
          <h2
            className="mb-1 text-lg font-semibold"
          >
            New members
          </h2>
          <p
            className="mb-6 text-sm text-foreground/60"
          >
            Welcome our newest community members
          </p>
          {showSkeleton
            ? (
              <MemberGridSkeleton
                count={12}
              />
            )
            : (
              <Suspense
                fallback={(
                  <MemberGridSkeleton
                    count={12}
                  />
                )}
              >
                <NewMembersSection />
              </Suspense>
            )}
        </div>

        <div
          className="mt-6 flex justify-center"
        >
          <Button
            href="/members/all"
            variant="secondary"
          >
            View all members
          </Button>
        </div>
      </PageContainer>
    </>
  );
}

function MemberCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="animate-pulse rounded-lg border border-border-color bg-background-light px-2 py-3 flex flex-col items-center gap-2"
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <div
        className="size-16 rounded-full bg-background-medium"
      />
      <div
        className="w-full flex flex-col items-center"
      >
        <div
          className="h-[18px] bg-background-medium rounded w-3/4 mb-0.5"
        />
        <div
          className="h-4 bg-background-medium rounded w-1/2"
        />
        <div
          className="h-4 bg-background-medium rounded w-2/3 mt-2"
        />
      </div>
    </div>
  );
}

function MemberGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <MemberCardSkeleton
          key={i}
          index={i}
        />
      ))}
    </div>
  );
}

const PILL_WIDTHS = [80, 100, 68, 112, 76, 96, 88, 104, 72, 92, 84, 108, 76, 96, 80, 112, 68, 100, 88, 72];

function InterestsSkeleton() {
  return (
    <div
      className="flex flex-wrap gap-2"
    >
      {PILL_WIDTHS.map((w, i) => (
        <div
          key={i}
          className="h-7.5 animate-pulse rounded-full bg-background-light border border-border-color"
          style={{ width: w, animationDelay: `${i * 50}ms` }}
        />
      ))}
    </div>
  );
}

function InterestCardsSkeleton() {
  return (
    <div
      className="grid gap-3 xs:grid-cols-2 md:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-border-color bg-background-light px-4 py-3"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div
            className="flex items-center gap-3 mb-3 h-6"
          >
            <div
              className="h-5 rounded bg-background-medium"
              style={{ width: PILL_WIDTHS[i % PILL_WIDTHS.length] }}
            />
            <div
              className="h-4 w-16 rounded bg-background-medium"
            />
          </div>
          <div
            className="flex -space-x-2"
          >
            {Array.from({ length: 4 }).map((_, j) => (
              <div
                key={j}
                className="size-12 rounded-full bg-background-medium ring-2 ring-background-light"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Separate components for each section to enable Suspense boundaries
async function PopularInterestsSection() {
  const popularInterests = await getPopularInterests(20);

  if (popularInterests.length === 0) return null;

  return (
    <InterestCloud
      interests={popularInterests}
    />
  );
}

async function RandomInterestsSection() {
  const randomInterests = await getRandomInterestsWithMembers(6, 10);

  if (randomInterests.length === 0) return null;

  return (
    <div
      className="grid gap-3 xs:grid-cols-2 md:grid-cols-3"
    >
      {randomInterests.map(({ interest, members }) => (
        <Link
          key={interest.id}
          href={`/members/interest/${encodeURIComponent(interest.name)}`}
          className="group rounded-lg border border-border-color bg-background-light px-4 py-3 transition-colors hover:border-primary hover:bg-background"
        >
          <div
            className="flex items-center gap-3 mb-3"
          >
            <div
              className="min-w-0 flex-1"
            >
              <span
                className="font-medium text-sm group-hover:text-primary transition-colors"
              >
                {interest.name}
              </span>
              <span
                className="ml-2 text-xs text-foreground/40"
              >
                {interest.count || 0}
                {' '}
                {(interest.count || 0) === 1 ? 'member' : 'members'}
              </span>
            </div>
            <svg
              className="size-4 shrink-0 text-foreground/30 group-hover:text-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <div
            className="flex -space-x-2 items-center"
          >
            {members.slice(0, 4).map((member) => (
              <Avatar
                key={member.id}
                avatarUrl={member.avatar_url}
                fullName={member.full_name}
                size="md"
                className="ring-2 ring-background-light"
              />
            ))}
            {members.length > 4 && (
              <div
                className="z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-background-medium border-2 border-background text-sm font-semibold text-foreground/70"
              >
                +
                {members.length - 4}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

async function RecentlyActiveSection() {
  const recentlyActive = await getRecentlyActiveMembers(12);

  if (recentlyActive.length === 0) return null;

  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
    >
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
  );
}

async function PopularTagsSection() {
  const popularTags = await getPopularTagsWithMemberCounts(20);

  if (popularTags.length === 0) return null;

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
    <div
      className="flex flex-wrap gap-2 items-center"
    >
      {popularTags.map((tag) => {
        const count = tag.memberCount || 0;
        return (
          <Link
            key={tag.id}
            href={`/members/tag/${encodeURIComponent(tag.name)}`}
            className="group"
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
  );
}

async function NewMembersSection() {
  const newMembers = await getNewMembers(12);

  if (newMembers.length === 0) return null;

  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
    >
      {newMembers.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          badge={member.created_at ? formatJoinedDate(member.created_at) : undefined}
        />
      ))}
    </div>
  );
}
