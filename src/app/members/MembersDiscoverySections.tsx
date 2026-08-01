'use client';

import Avatar from '@/components/auth/Avatar';
import InterestCloud from '@/components/shared/InterestCloud';
import MemberCard from '@/components/shared/MemberCard';
import Tag from '@/components/shared/Tag';
import type { MembersDiscoveryData } from '@/lib/data/members';
import { formatJoinedDate } from '@/utils/utils';
import Link from 'next/link';

type MembersDiscoverySectionsProps = {
  data: MembersDiscoveryData;
};

export default function MembersDiscoverySections({ data }: MembersDiscoverySectionsProps) {
  return (
    <>
      <div
        className="mb-10"
      >
        <h2
          className="mb-3 text-xl font-semibold font-heading opacity-80"
        >
          Popular interests
        </h2>
        <PopularInterestsSection
          popularInterests={data.popularInterests}
        />
      </div>
      <div
        className="mb-10"
      >
        <h2
          className="mb-4 text-xl font-semibold font-heading opacity-80"
        >
          Explore by interests
        </h2>
        <RandomInterestsSection
          randomInterests={data.randomInterests}
        />
      </div>
      <div
        className="mb-10"
      >
        <h2
          className="mb-1 text-xl font-semibold font-heading opacity-80"
        >
          Recently active
        </h2>
        <p
          className="mb-6 text-sm text-foreground/60"
        >
          Members who have shared photos or albums recently
        </p>
        <RecentlyActiveSection
          recentlyActive={data.recentlyActive}
        />
      </div>
      <div
        className="mb-10"
      >
        <h2
          className="mb-1 text-xl font-semibold font-heading opacity-80"
        >
          Explore by photo style
        </h2>
        <p
          className="mb-6 text-sm text-foreground/60"
        >
          Discover members who frequently use these photo tags
        </p>
        <PopularTagsSection
          popularTags={data.popularTags}
        />
      </div>
      <div>
        <h2
          className="mb-1 text-xl font-semibold font-heading opacity-80"
        >
          New members
        </h2>
        <p
          className="mb-6 text-sm text-foreground/60"
        >
          Welcome our newest community members
        </p>
        <NewMembersSection
          newMembers={data.newMembers}
        />
      </div>
    </>
  );
}

function PopularInterestsSection({ popularInterests }: { popularInterests: MembersDiscoveryData['popularInterests'] }) {
  if (popularInterests.length === 0) return null;

  return (
    <InterestCloud
      interests={popularInterests}
    />
  );
}

function RandomInterestsSection({ randomInterests }: { randomInterests: MembersDiscoveryData['randomInterests'] }) {
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
              className="flex items-center min-w-0 flex-1"
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
                className="z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-background-medium border-2 border-background text-sm font-semibold text-foreground/80"
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

function RecentlyActiveSection({ recentlyActive }: { recentlyActive: MembersDiscoveryData['recentlyActive'] }) {
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

function PopularTagsSection({ popularTags }: { popularTags: MembersDiscoveryData['popularTags'] }) {
  if (popularTags.length === 0) return null;

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

function NewMembersSection({ newMembers }: { newMembers: MembersDiscoveryData['newMembers'] }) {
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
