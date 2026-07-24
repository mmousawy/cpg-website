import PageContainer from '@/components/layout/PageContainer';
import ArrowLink from '@/components/shared/ArrowLink';
import Button from '@/components/shared/Button';
import MemberCard from '@/components/shared/MemberCard';
import { routes } from '@/config/routes';
import { getAllMembers } from '@/lib/data/members';
import { createMetadata } from '@/utils/metadata';
import { getServerAuth } from '@/utils/supabase/getServerAuth';
import { formatJoinedDate } from '@/utils/utils';
import { Suspense } from 'react';

export const metadata = createMetadata({
  title: 'All community members',
  description: 'Browse all members of our photography community.',
  canonical: '/members/all',
  keywords: ['photography community', 'photographers', 'all members', 'community members'],
});

export default function AllMembersPage() {
  return (
    <Suspense
      fallback={<AllMembersSkeleton />}
    >
      <AllMembersContent />
    </Suspense>
  );
}

async function AllMembersContent() {
  const { user } = await getServerAuth();

  if (!user) {
    return (
      <PageContainer>
        <div
          className="mb-8"
        >
          <h1
            className="text-2xl sm:text-3xl font-bold mb-2 font-heading"
          >
            All members
          </h1>
          <p
            className="text-base sm:text-lg opacity-80"
          >
            Sign in to see all community members
          </p>
        </div>

        <div
          className="rounded-xl border border-border-color bg-background-light p-8 text-center"
        >
          <h2
            className="mb-2 text-xl font-semibold font-heading"
          >
            Join our community
          </h2>
          <p
            className="mb-6 text-foreground/80"
          >
            Sign in to browse all members of our photography community.
          </p>
          <div
            className="flex flex-wrap justify-center gap-3"
          >
            <Button
              href={`${routes.login.url}?redirectTo=/members/all`}
            >
              Log in
            </Button>
            <Button
              href={`${routes.signup.url}?redirectTo=/members/all`}
              variant="secondary"
            >
              Sign up
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  const members = await getAllMembers();

  return (
    <PageContainer>
      <ArrowLink
        href="/members"
        direction="left"
        className="mb-6"
      >
        Back to members
      </ArrowLink>

      <AllMembersHeader
        count={members.length}
      />

      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
      >
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            badge={member.created_at ? formatJoinedDate(member.created_at) : undefined}
          />
        ))}
      </div>
    </PageContainer>
  );
}

function AllMembersHeader({ count }: { count?: number }) {
  return (
    <div
      className="mb-8"
    >
      <h1
        className="text-2xl sm:text-3xl font-bold mb-2 font-heading"
      >
        All members
      </h1>
      <p
        className="text-base sm:text-lg opacity-80"
      >
        {count === undefined
          ? 'Loading community members…'
          : (
            <>
              {count}
              {' '}
              {count === 1 ? 'member' : 'members'}
              {' '}
              in our community
            </>
          )}
      </p>
    </div>
  );
}

function AllMembersSkeleton() {
  return (
    <PageContainer>
      <div
        className="mb-6 h-5 w-36 animate-pulse rounded bg-background-medium"
      />
      <AllMembersHeader />
      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg border border-border-color bg-background-light px-2 py-3 flex flex-col items-center gap-2"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <div
              className="size-16 rounded-full bg-background-medium"
            />
            <div
              className="w-full flex flex-col items-center"
            >
              <div
                className="h-4.5 bg-background-medium rounded w-3/4 mb-0.5"
              />
              <div
                className="h-4 bg-background-medium rounded w-1/2"
              />
              <div
                className="h-4 bg-background-medium rounded w-2/3 mt-2"
              />
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
