import { Suspense } from 'react';

import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import HelpLink from '@/components/shared/HelpLink';
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getMembersDiscoveryData } from '@/lib/data/members';
import { createMetadata } from '@/utils/metadata';
import { createClient } from '@/utils/supabase/server';

import MembersDiscoverySections from '@/app/members/MembersDiscoverySections';
import MembersDiscoverySkeleton from '@/app/members/MembersDiscoverySkeleton';
import MembersPageHeader from '@/app/members/MembersPageHeader';
import { routes } from '@/config/routes';

export const metadata = createMetadata({
  title: 'Meet our photographers',
  description: 'Explore and connect with our community members. Find photographers by interests, recent activity, and photo styles.',
  canonical: '/members',
  keywords: ['photography community', 'photographers', 'member discovery', 'community members'],
});

export default function MembersPage() {
  return (
    <Suspense
      fallback={<MembersPageSkeleton />}
    >
      <MembersPageContent />
    </Suspense>
  );
}

function MembersPageSkeleton() {
  return (
    <PageContainer>
      <MembersPageHeader />
      <MembersDiscoverySkeleton />
      <div
        className="mt-6 flex justify-center"
      >
        <div
          className="h-10 w-40 animate-pulse rounded-full border border-border-color-strong bg-background-medium"
        />
      </div>
    </PageContainer>
  );
}

async function MembersPageContent() {
  const user = await getMembersPageUser();

  if (!user) {
    return <UnauthenticatedMembersPage />;
  }

  const includeTestContent = await getIncludeTestContent();
  const data = await getMembersDiscoveryData(includeTestContent);

  return (
    <PageContainer>
      <MembersPageHeader />
      <MembersDiscoverySections
        data={data}
      />
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
  );
}

async function getMembersPageUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

function UnauthenticatedMembersPage() {
  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <div
          className="flex items-center gap-2 mb-1"
        >
          <h1
            className="text-2xl sm:text-3xl font-bold font-heading"
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
          className="text-base sm:text-lg opacity-80"
        >
          Sign in to discover and connect with our community members
        </p>
      </div>

      <div
        className="rounded-xl border border-border-color bg-background-light p-4 sm:p-8 text-center"
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
          className="mb-4 text-2xl font-semibold font-heading"
        >
          Join our community
        </h2>
        <p
          className="mb-6 text-foreground/80"
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
