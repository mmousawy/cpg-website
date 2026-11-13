import Link from 'next/link';

import Avatar from '@/components/auth/Avatar';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import MemberHoverCard from '@/components/shared/MemberHoverCard';
import { routes } from '@/config/routes';
import type { HomePageData } from '@/lib/data/home';

type HomeMembersSectionProps = Pick<HomePageData, 'organizers' | 'recentMembers'>;

export function HomeMembersSection({ organizers, recentMembers }: HomeMembersSectionProps) {
  const { members, total: memberTotal } = recentMembers;
  const otherMembersCount = Math.max(0, memberTotal - members.length);

  return (
    <PageContainer
      className="py-0!"
    >
      <Container
        className="grid gap-6 md:gap-8"
      >
        <div>
          <h2
            className="text-2xl font-bold mb-2 font-heading"
          >
            Meet the community
          </h2>
          <p
            className="max-w-[50ch] text-foreground/90 leading-relaxed"
          >
            Meet the team of dedicated organizers who keep the community thriving, and passionate photographers who are eager to share their work and learn from others!
          </p>
        </div>

        {organizers && organizers.length > 0 && (
          <div>
            <h3
              className="text-lg font-semibold mb-2"
            >
              Organizers
            </h3>
            <div
              className="grid gap-4 sm:grid-cols-2 sm:gap-6"
            >
              {organizers.map((organizer) => {
                const organizerLink = (
                  <Link
                    href={organizer.nickname ? `/@${organizer.nickname}` : '#'}
                    prefetch={false}
                    className="flex items-start gap-4 rounded-xl border border-border-color bg-background/60 p-4 transition-colors hover:border-primary group"
                  >
                    <Avatar
                      avatarUrl={organizer.avatar_url}
                      fullName={organizer.full_name}
                      size="lg"
                      hoverEffect
                    />
                    <div
                      className="flex-1 min-w-0"
                    >
                      <p
                        className="font-semibold group-hover:text-primary transition-colors leading-tight"
                      >
                        {organizer.full_name || 'Organizer'}
                      </p>
                      {organizer.nickname && (
                        <p
                          className="text-sm opacity-70 group-hover:text-primary transition-colors"
                        >
                          {`@${organizer.nickname}`}
                        </p>
                      )}
                      {organizer.bio && (
                        <p
                          className="mt-2 text-sm text-foreground/90 line-clamp-2"
                        >
                          {organizer.bio}
                        </p>
                      )}
                    </div>
                  </Link>
                );

                if (!organizer.nickname) {
                  return (
                    <div
                      key={organizer.id}
                    >
                      {organizerLink}
                    </div>
                  );
                }

                return (
                  <MemberHoverCard
                    key={organizer.id}
                    nickname={organizer.nickname}
                    fullName={organizer.full_name}
                    avatarUrl={organizer.avatar_url}
                  >
                    {organizerLink}
                  </MemberHoverCard>
                );
              })}
            </div>
          </div>
        )}

        {members && members.length > 0 && (
          <div>
            <h3
              className="text-lg font-semibold mb-2"
            >
              Members
            </h3>
            <div
              className="flex flex-wrap gap-2"
            >
              {members.map((member) => {
                const memberButton = (
                  <Button
                    href={member.nickname ? `/@${member.nickname}` : '#'}
                    prefetch={false}
                    variant="secondary"
                    size="sm"
                    className="px-2!"
                    icon={
                      <Avatar
                        avatarUrl={member.avatar_url}
                        fullName={member.full_name}
                        size="xxs"
                        hoverEffect
                      />
                    }
                  >
                    {`@${member.nickname || member.full_name}`}
                  </Button>
                );

                if (!member.nickname) {
                  return (
                    <div
                      key={member.id}
                    >
                      {memberButton}
                    </div>
                  );
                }

                return (
                  <MemberHoverCard
                    key={member.id}
                    nickname={member.nickname}
                    fullName={member.full_name}
                    avatarUrl={member.avatar_url}
                  >
                    {memberButton}
                  </MemberHoverCard>
                );
              })}
              {otherMembersCount > 0 && (
                <Button
                  href={routes.members.url}
                  prefetch={false}
                  variant="secondary"
                  size="sm"
                >
                  {`+${otherMembersCount} other ${otherMembersCount === 1 ? 'member' : 'members'}`}
                </Button>
              )}
            </div>
          </div>
        )}
      </Container>
    </PageContainer>
  );
}
