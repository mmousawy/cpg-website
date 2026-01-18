'use client';

import Container from '@/components/layout/Container';
import type { AccountStats } from '@/hooks/useAccountForm';
import type { Profile } from '@/hooks/useAccountForm';

interface AccountStatsSectionProps {
  profile: Profile | null;
  stats: AccountStats;
}

export default function AccountStatsSection({ profile, stats }: AccountStatsSectionProps) {
  return (
    <div>
      <h2
        className="mb-4 text-lg font-semibold opacity-70"
      >
        Account info
      </h2>
      <Container>
        <div
          className="space-y-4"
        >
          <div
            className="grid grid-cols-2 gap-4 text-sm"
          >
            <div>
              <p
                className="text-foreground font-medium"
              >
                Member since
              </p>
              <p
                className="text-foreground/70"
              >
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
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
                className="text-foreground/70"
              >
                {stats.lastLoggedIn
                  ? new Date(stats.lastLoggedIn).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                  : 'Never'}
              </p>
            </div>
          </div>

          <div
            className="border-border-color-strong border-t pt-4"
          >
            <p
              className="text-foreground mb-3 text-sm font-medium"
            >
              Content
            </p>
            <div
              className="grid grid-cols-2 gap-4 text-sm"
            >
              <div>
                <p
                  className="text-foreground/70"
                >
                  Albums
                </p>
                <p
                  className="text-foreground text-lg font-semibold"
                >
                  {stats.albums}
                </p>
              </div>
              <div>
                <p
                  className="text-foreground/70"
                >
                  Photos
                </p>
                <p
                  className="text-foreground text-lg font-semibold"
                >
                  {stats.photos}
                </p>
              </div>
            </div>
          </div>

          <div
            className="border-border-color-strong border-t pt-4"
          >
            <p
              className="text-foreground mb-3 text-sm font-medium"
            >
              Engagement
            </p>
            <div
              className="grid grid-cols-2 gap-4 text-sm"
            >
              <div>
                <p
                  className="text-foreground/70"
                >
                  Likes received
                </p>
                <p
                  className="text-foreground text-lg font-semibold"
                >
                  {stats.likesReceived}
                </p>
              </div>
              <div>
                <p
                  className="text-foreground/70"
                >
                  Likes given
                </p>
                <p
                  className="text-foreground text-lg font-semibold"
                >
                  {stats.likesMade}
                </p>
              </div>
              <div>
                <p
                  className="text-foreground/70"
                >
                  Comments made
                </p>
                <p
                  className="text-foreground text-lg font-semibold"
                >
                  {stats.commentsMade}
                </p>
              </div>
              <div>
                <p
                  className="text-foreground/70"
                >
                  Comments received
                </p>
                <p
                  className="text-foreground text-lg font-semibold"
                >
                  {stats.commentsReceived}
                </p>
              </div>
              <div>
                <p
                  className="text-foreground/70"
                >
                  Views received
                </p>
                <p
                  className="text-foreground text-lg font-semibold"
                >
                  {stats.viewsReceived}
                </p>
              </div>
            </div>
          </div>

          <div
            className="border-border-color-strong border-t pt-4"
          >
            <p
              className="text-foreground mb-3 text-sm font-medium"
            >
              Events
            </p>
            <div
              className="grid grid-cols-2 gap-4 text-sm"
            >
              <div>
                <p
                  className="text-foreground/70"
                >
                  Events attended
                </p>
                <p
                  className="text-foreground text-lg font-semibold"
                >
                  {stats.eventsAttended}
                </p>
              </div>
              <div>
                <p
                  className="text-foreground/70"
                >
                  RSVPs
                </p>
                <p
                  className="text-foreground text-lg font-semibold"
                >
                  {stats.rsvpsConfirmed}
                  {' '}
                  confirmed /
                  {stats.rsvpsCanceled}
                  {' '}
                  canceled
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
