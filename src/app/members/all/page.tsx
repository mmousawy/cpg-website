import ArrowLink from '@/components/shared/ArrowLink';
import MemberCard from '@/components/shared/MemberCard';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import { routes } from '@/config/routes';
import { createMetadata } from '@/utils/metadata';
import { getServerAuth } from '@/utils/supabase/getServerAuth';
import { formatJoinedDate } from '@/utils/utils';
import { getAllMembers } from '@/lib/data/members';

export const metadata = createMetadata({
  title: 'All members',
  description: 'Browse all members of our photography community.',
  canonical: '/members/all',
  keywords: ['photography community', 'photographers', 'all members', 'community members'],
});

export default async function AllMembersPage() {
  const { user } = await getServerAuth();

  if (!user) {
    return (
      <PageContainer>
        <div
          className="mb-8"
        >
          <h1
            className="text-2xl sm:text-3xl font-bold mb-2"
          >
            All members
          </h1>
          <p
            className="text-base sm:text-lg opacity-70"
          >
            Sign in to see all community members
          </p>
        </div>

        <div
          className="rounded-xl border border-border-color bg-background-light p-8 text-center"
        >
          <h2
            className="mb-2 text-xl font-semibold"
          >
            Join our community
          </h2>
          <p
            className="mb-6 text-foreground/70"
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

      <div
        className="mb-8"
      >
        <h1
          className="text-2xl sm:text-3xl font-bold mb-2"
        >
          All members
        </h1>
        <p
          className="text-base sm:text-lg opacity-70"
        >
          {members.length}
          {' '}
          {members.length === 1 ? 'member' : 'members'}
          {' '}
          in our community
        </p>
      </div>

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
