import Link from 'next/link';

import Avatar from '@/components/auth/Avatar';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import { routes } from '@/config/routes';
import { getOrganizers, getRecentMembers } from '@/lib/data/profiles';

export async function HomeMembersSection() {
  const organizers = await getOrganizers(5);
  const recentMembers = await getRecentMembers(8);
  const { members, total: memberTotal } = recentMembers;
  const otherMembersCount = Math.max(0, memberTotal - members.length);

  return (
    <PageContainer
      className="py-0!"
    >
      <Container
        className="grid gap-10 md:gap-12"
      >
        <div>
          <h2
            className="text-2xl font-bold mb-4 font-heading"
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
              className="text-lg font-semibold mb-4"
            >
              Organizers
            </h3>
            <div
              className="grid gap-4 sm:grid-cols-2 sm:gap-6"
            >
              {organizers.map((organizer) => (
                <Link
                  key={organizer.id}
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
                        className="text-sm opacity-80 group-hover:text-primary transition-colors"
                      >
                        {`@${organizer.nickname}`}
                      </p>
                    )}
                    {organizer.bio && (
                      <p
                        className="mt-4 text-sm text-foreground/80 line-clamp-2"
                      >
                        {organizer.bio}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {members && members.length > 0 && (
          <div>
            <h3
              className="text-lg font-semibold mb-4"
            >
              Members
            </h3>
            <div
              className="flex flex-wrap gap-2"
            >
              {members.map((member) => (
                <Button
                  key={member.id}
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
              ))}
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
