'use client';

import clsx from 'clsx';
import Container from '@/components/layout/Container';
import Button from '@/components/shared/Button';
import CheckCircleSVG from 'public/icons/check-circle.svg';
import CloseSVG from 'public/icons/close.svg';

import type { Tables } from '@/database.types';

type RSVPWithProfile = Pick<
  Tables<'events_rsvps'>,
  'id' | 'uuid' | 'name' | 'email' | 'confirmed_at' | 'canceled_at' | 'attended_at' | 'created_at'
> & {
  profiles: Pick<Tables<'profiles'>, 'nickname'> | Pick<Tables<'profiles'>, 'nickname'>[] | null;
};

interface EventRsvpListProps {
  rsvps: RSVPWithProfile[];
  markingId: number | null;
  onMarkAttended: (rsvpId: number, unmark?: boolean) => Promise<void>;
}

export default function EventRsvpList({
  rsvps,
  markingId,
  onMarkAttended,
}: EventRsvpListProps) {
  const confirmedRsvps = rsvps.filter((r) => r.confirmed_at && !r.canceled_at);
  const attendedCount = rsvps.filter((r) => r.attended_at).length;

  return (
    <Container>
      <h2
        className="mb-6 text-xl font-semibold"
      >
        Event Attendance
      </h2>
      <div
        className="mb-6 rounded-lg border border-border-color bg-background p-4"
      >
        <div
          className="flex flex-wrap gap-4 text-sm"
        >
          <span
            className="font-medium text-foreground"
          >
            {confirmedRsvps.length}
            {' '}
            confirmed
          </span>
          <span
            className="font-medium text-green-600"
          >
            {attendedCount}
            {' '}
            attended
          </span>
        </div>
      </div>

      <div
        className="space-y-2"
      >
        {confirmedRsvps.length === 0 ? (
          <p
            className="text-center text-sm text-foreground/70 py-4"
          >
            No confirmed RSVPs yet
          </p>
        ) : (
          confirmedRsvps.map((rsvp) => {
            const profile = Array.isArray(rsvp.profiles) ? rsvp.profiles[0] : rsvp.profiles;
            const nickname = profile?.nickname;
            return (
              <div
                key={rsvp.id}
                className={clsx(
                  'flex items-center justify-between rounded-lg border border-border-color p-3',
                  rsvp.attended_at && 'text-primary border-green-600/30 bg-green-500/5',
                )}
              >
                <div>
                  <p
                    className="text-sm font-medium"
                  >
                    {rsvp.name}
                    {' '}
                    {nickname && `(@${nickname})`}
                  </p>
                  <p
                    className="text-xs text-foreground/60"
                  >
                    {rsvp.email}
                  </p>
                </div>
                <div
                  className="flex items-center gap-2"
                >
                  {rsvp.attended_at ? (
                    <Button
                      onClick={() => onMarkAttended(rsvp.id, true)}
                      disabled={markingId === rsvp.id}
                      variant="danger"
                      type="button"
                      size="sm"
                      icon={<CloseSVG
                        className="size-4"
                      />}
                    >
                      <span
                        className="hidden sm:inline"
                      >
                        {markingId === rsvp.id ? 'Unmarking...' : 'Unmark attended'}
                      </span>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onMarkAttended(rsvp.id)}
                      disabled={markingId === rsvp.id}
                      type="button"
                      size="sm"
                      icon={<CheckCircleSVG
                        className="size-4"
                      />}
                    >
                      <span
                        className="hidden sm:inline"
                      >
                        {markingId === rsvp.id ? 'Marking...' : 'Mark attended'}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Container>
  );
}
