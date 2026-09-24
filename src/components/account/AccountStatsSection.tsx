'use client';

import Container from '@/components/layout/Container';
import ArrowLink from '@/components/shared/ArrowLink';
import { routes } from '@/config/routes';
import type { AccountStats, Profile } from '@/hooks/useAccountForm';

type AccountStatsWithChallenges = AccountStats & {
  challengesParticipated?: number;
  challengePhotosAccepted?: number;
};

interface AccountStatsSectionProps {
  profile: Profile | null;
  stats: AccountStatsWithChallenges;
}

export default function AccountStatsSection({ profile, stats }: AccountStatsSectionProps) {
  return (
    <div>
      <div
        className="mb-2 flex items-center justify-between gap-3 sm:mb-4"
      >
        <h2
          className="text-lg font-semibold opacity-80 font-heading"
        >
          Account info
        </h2>
        <ArrowLink
          href={routes.accountStats.url}
        >
          View full stats
        </ArrowLink>
      </div>
      <Container>
        <div
          className="space-y-3 sm:space-y-4"
        >
          <div
            className="grid grid-cols-2 gap-3 text-sm sm:gap-4"
          >
            <div>
              <p
                className="text-foreground font-medium"
              >
                Member since
              </p>
              <p
                className="text-foreground/80"
              >
                {profile?.created_at
                  ? (() => { const d = new Date(profile.created_at); return d.toLocaleDateString('en-US', { year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric', month: 'long', day: 'numeric' }); })()
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p
                className="text-foreground font-medium"
              >
                Last logged in
              </p>
              <p
                className="text-foreground/80"
              >
                {stats.lastLoggedIn
                  ? (() => { const d = new Date(stats.lastLoggedIn); return d.toLocaleDateString('en-US', { year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric', month: 'long', day: 'numeric' }); })()
                  : 'Never'}
              </p>
            </div>
          </div>

          <div
            className="border-border-color-strong border-t pt-3 sm:pt-4"
          >
            <p
              className="text-foreground mb-2 text-sm font-medium sm:mb-3"
            >
              Content
            </p>
            <div
              className="grid grid-cols-2 gap-3 text-sm sm:gap-4"
            >
              <div>
                <p
                  className="text-foreground/80"
                >
                  Albums
                </p>
                <p
                  className="text-foreground text-base font-semibold sm:text-lg"
                >
                  {stats.albums}
                </p>
              </div>
              <div>
                <p
                  className="text-foreground/80"
                >
                  Photos
                </p>
                <p
                  className="text-foreground text-base font-semibold sm:text-lg"
                >
                  {stats.photos}
                </p>
              </div>
            </div>
          </div>

          <div
            className="border-border-color-strong border-t pt-3 sm:pt-4"
          >
            <p
              className="text-foreground mb-2 text-sm font-medium sm:mb-3"
            >
              Engagement
            </p>
            <div
              className="grid grid-cols-2 gap-3 text-sm sm:gap-4"
            >
              <div>
                <p
                  className="text-foreground/80"
                >
                  Likes received
                </p>
                <p
                  className="text-foreground text-base font-semibold sm:text-lg"
                >
                  {stats.likesReceived}
                </p>
              </div>
              <div>
                <p
                  className="text-foreground/80"
                >
                  Likes given
                </p>
                <p
                  className="text-foreground text-base font-semibold sm:text-lg"
                >
                  {stats.likesMade}
                </p>
              </div>
              <div>
                <p
                  className="text-foreground/80"
                >
                  Comments made
                </p>
                <p
                  className="text-foreground text-base font-semibold sm:text-lg"
                >
                  {stats.commentsMade}
                </p>
              </div>
              <div>
                <p
                  className="text-foreground/80"
                >
                  Comments received
                </p>
                <p
                  className="text-foreground text-base font-semibold sm:text-lg"
                >
                  {stats.commentsReceived}
                </p>
              </div>
              <div>
                <p
                  className="text-foreground/80"
                >
                  Views received
                </p>
                <p
                  className="text-foreground text-base font-semibold sm:text-lg"
                >
                  {stats.viewsReceived}
                </p>
              </div>
            </div>
          </div>

          <div
            className="border-border-color-strong border-t pt-3 sm:pt-4"
          >
            <p
              className="text-foreground mb-2 text-sm font-medium sm:mb-3"
            >
              Attendance
            </p>
            <div
              className="grid grid-cols-2 gap-3 text-sm sm:gap-4"
            >
              <div>
                <p
                  className="text-foreground/80"
                >
                  Events attended
                </p>
                <p
                  className="text-foreground text-base font-semibold sm:text-lg"
                >
                  {stats.eventsAttended}
                </p>
              </div>
              <div>
                <p
                  className="text-foreground/80"
                >
                  RSVPs
                </p>
                <p
                  className="text-foreground text-base font-semibold sm:text-lg"
                >
                  {stats.rsvpsConfirmed}
                  {' '}
                  confirmed /
                  {' '}
                  {stats.rsvpsCanceled}
                  {' '}
                  canceled
                </p>
              </div>
            </div>
          </div>

          <div
            className="border-border-color-strong border-t pt-3 sm:pt-4"
          >
            <p
              className="text-foreground mb-2 text-sm font-medium sm:mb-3"
            >
              Challenges
            </p>
            <div
              className="grid grid-cols-2 gap-3 text-sm sm:gap-4"
            >
              <div>
                <p
                  className="text-foreground/80"
                >
                  Participated
                </p>
                <p
                  className="text-foreground text-base font-semibold sm:text-lg"
                >
                  {stats.challengesParticipated ?? 0}
                </p>
              </div>
              <div>
                <p
                  className="text-foreground/80"
                >
                  Photos accepted
                </p>
                <p
                  className="text-foreground text-base font-semibold sm:text-lg"
                >
                  {stats.challengePhotosAccepted ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
