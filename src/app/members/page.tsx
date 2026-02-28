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

export default async function MembersPage() {
  const { user } = await getServerAuth();

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
              className="text-3xl font-bold"
            >
              Discover our community
            </h1>
            <HelpLink
              href="discover-members"
              label="Help with discovering members"
            />
          </div>
          <p
            className="text-lg opacity-70"
          >
            Explore members by interests, recent activity, and photo styles
          </p>
        </div>

        {/* Popular Interests Section */}
        <Suspense
          fallback={<InterestsSkeleton />}
        >
          <PopularInterestsSection />
        </Suspense>

        {/* Random Interests with Members */}
        <Suspense
          fallback={(
            <MemberGridSkeleton
              title
              count={15}
            />
          )}
        >
          <RandomInterestsSection />
        </Suspense>

        {/* Recently Active Members */}
        <Suspense
          fallback={(
            <MemberGridSkeleton
              title
              subtitle
              count={12}
            />
          )}
        >
          <RecentlyActiveSection />
        </Suspense>

        {/* Explore by Photo Style (Tags) */}
        <Suspense
          fallback={<TagsSkeleton />}
        >
          <PopularTagsSection />
        </Suspense>

        {/* New Members */}
        <Suspense
          fallback={(
            <MemberGridSkeleton
              title
              subtitle
              count={12}
            />
          )}
        >
          <NewMembersSection />
        </Suspense>
      </PageContainer>
    </>
  );
}

function MemberCardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-lg border border-border-color bg-background-light px-2 py-3 flex flex-col items-center gap-2"
    >
      <div
        className="size-16 rounded-full bg-background-medium"
      />
      <div
        className="space-y-1.5 w-full flex flex-col items-center"
      >
        <div
          className="h-3.5 bg-background-medium rounded w-3/4"
        />
        <div
          className="h-3 bg-background-medium rounded w-1/2"
        />
      </div>
    </div>
  );
}

function MemberGridSkeleton({ title, subtitle, count = 10 }: { title?: boolean; subtitle?: boolean; count?: number }) {
  return (
    <div
      className="mb-10"
    >
      {title && (
        <div
          className="mb-1 h-6 w-40 animate-pulse rounded bg-background-light"
        />
      )}
      {subtitle && (
        <div
          className="mb-6 h-4 w-64 animate-pulse rounded bg-background-light"
        />
      )}
      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {Array.from({ length: count }).map((_, i) => (
          <MemberCardSkeleton
            key={i}
          />
        ))}
      </div>
    </div>
  );
}

const PILL_WIDTHS = [80, 100, 68, 112, 76, 96, 88, 104, 72, 92, 84, 108];

function InterestsSkeleton() {
  return (
    <div
      className="mb-10"
    >
      <div
        className="mb-3 h-7 w-48 animate-pulse rounded bg-background-light"
      />
      <div
        className="flex flex-wrap gap-2"
      >
        {PILL_WIDTHS.map((w, i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded-full bg-background-light"
            style={{ width: w }}
          />
        ))}
      </div>
    </div>
  );
}

function TagsSkeleton() {
  return (
    <div
      className="mb-10"
    >
      <div
        className="mb-1 h-6 w-40 animate-pulse rounded bg-background-light"
      />
      <div
        className="mb-6 h-4 w-64 animate-pulse rounded bg-background-light"
      />
      <div
        className="flex flex-wrap gap-2"
      >
        {PILL_WIDTHS.slice(0, 10).map((w, i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded-full bg-background-light"
            style={{ width: w }}
          />
        ))}
      </div>
    </div>
  );
}

// Separate components for each section to enable Suspense boundaries
async function PopularInterestsSection() {
  const popularInterests = await getPopularInterests(20);

  if (popularInterests.length === 0) return null;

  return (
    <div
      className="mb-10"
    >
      <h2
        className="mb-3 text-xl font-semibold"
      >
        Popular interests
      </h2>
      <InterestCloud
        interests={popularInterests}
      />
    </div>
  );
}

async function RandomInterestsSection() {
  const randomInterests = await getRandomInterestsWithMembers(6, 10);

  if (randomInterests.length === 0) return null;

  return (
    <div
      className="mb-10"
    >
      <h2
        className="mb-4 text-xl font-semibold"
      >
        Explore by interests
      </h2>
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
    </div>
  );
}

async function RecentlyActiveSection() {
  const recentlyActive = await getRecentlyActiveMembers(12);

  if (recentlyActive.length === 0) return null;

  return (
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
      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
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
    </div>
  );
}

async function NewMembersSection() {
  const newMembers = await getNewMembers(12);

  if (newMembers.length === 0) return null;

  return (
    <div
      className=""
    >
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
      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {newMembers.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            badge={member.created_at ? formatJoinedDate(member.created_at) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
