'use client';

import Container from '@/components/layout/Container';
import Button from '@/components/shared/Button';
import clsx from 'clsx';
import CheckCircleSVG from 'public/icons/check-circle.svg';
import CloseSVG from 'public/icons/close.svg';
import PlusSVG from 'public/icons/plus.svg';
import TrashSVG from 'public/icons/trash-mini.svg';
import WarningSVG from 'public/icons/warning-micro.svg';

import type { Tables } from '@/database.types';

type RSVPWithProfile = Pick<
  Tables<'events_rsvps'>,
  'id' | 'uuid' | 'name' | 'email' | 'confirmed_at' | 'canceled_at' | 'attended_at' | 'no_show_at' | 'created_at'
> & {
  profiles: Pick<Tables<'profiles'>, 'nickname'> | Pick<Tables<'profiles'>, 'nickname'>[] | null;
};

interface EventRsvpListProps {
  rsvps: RSVPWithProfile[];
  markingId: number | null;
  onMarkAttended: (rsvpId: number, unmark?: boolean) => Promise<void>;
  onMarkNoShow: (rsvpId: number, unmark?: boolean) => Promise<void>;
  /** Called when the Remove button is clicked for a specific RSVP row. */
  onRemove?: (rsvpId: number) => Promise<void>;
  /** Called when the Add Member button is clicked. */
  onAdd?: () => void;
  removingId?: number | null;
}

export default function EventRsvpList({
  rsvps,
  markingId,
  onMarkAttended,
  onMarkNoShow,
  onRemove,
  onAdd,
  removingId = null,
}: EventRsvpListProps) {
  const confirmedRsvps = rsvps.filter((r) => r.confirmed_at && !r.canceled_at);
  const attendedCount = rsvps.filter((r) => r.attended_at).length;
  const noShowCount = rsvps.filter((r) => r.no_show_at).length;

  return (
    <Container>
      <div
        className="mb-6 flex items-center justify-between"
      >
        <h2
          className="text-xl font-semibold"
        >
          Event attendance
        </h2>
        {onAdd && (
          <Button
            type="button"
            size="sm"
            onClick={onAdd}
            icon={<PlusSVG
              className="size-4"
            />}
          >
            Add member
          </Button>
        )}
      </div>
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
          {noShowCount > 0 && (
            <span
              className="font-medium text-red-500"
            >
              {noShowCount}
              {' '}
              no-show
            </span>
          )}
        </div>
      </div>

      <div
        className="space-y-2"
      >
        {confirmedRsvps.length === 0 ? (
          <p
            className="text-center text-sm text-foreground/80 py-4"
          >
            No confirmed RSVPs yet
          </p>
        ) : (
          confirmedRsvps.map((rsvp) => {
            const profile = Array.isArray(rsvp.profiles) ? rsvp.profiles[0] : rsvp.profiles;
            const nickname = profile?.nickname;
            const isMarking = markingId === rsvp.id;
            const isRemoving = removingId === rsvp.id;
            return (
              <div
                key={rsvp.id}
                className={clsx(
                  'flex items-center justify-between rounded-lg border border-border-color p-3',
                  rsvp.attended_at && 'text-primary border-green-600/30 bg-green-500/5',
                  rsvp.no_show_at && !rsvp.attended_at && 'border-red-500/30 bg-red-500/5',
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
                  {rsvp.no_show_at && !rsvp.attended_at && (
                    <p
                      className="text-xs font-medium text-red-500 mt-0.5"
                    >
                      No-show
                    </p>
                  )}
                </div>
                <div
                  className="flex items-center gap-2"
                >
                  {rsvp.attended_at ? (
                    <Button
                      onClick={() => onMarkAttended(rsvp.id, true)}
                      disabled={isMarking || isRemoving}
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
                        {isMarking ? 'Unmarking...' : 'Unmark attended'}
                      </span>
                    </Button>
                  ) : rsvp.no_show_at ? (
                    <Button
                      onClick={() => onMarkNoShow(rsvp.id, true)}
                      disabled={isMarking || isRemoving}
                      variant="secondary"
                      type="button"
                      size="sm"
                      icon={<CloseSVG
                        className="size-4"
                      />}
                    >
                      <span
                        className="hidden sm:inline"
                      >
                        {isMarking ? 'Unmarking...' : 'Unmark no-show'}
                      </span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => onMarkNoShow(rsvp.id)}
                        disabled={isMarking || isRemoving}
                        variant="danger"
                        type="button"
                        size="sm"
                        icon={<WarningSVG
                          className="size-4"
                        />}
                      >
                        <span
                          className="hidden sm:inline"
                        >
                          {isMarking ? 'Marking...' : 'No-show'}
                        </span>
                      </Button>
                      <Button
                        onClick={() => onMarkAttended(rsvp.id)}
                        disabled={isMarking || isRemoving}
                        type="button"
                        size="sm"
                        icon={<CheckCircleSVG
                          className="size-4"
                        />}
                      >
                        <span
                          className="hidden sm:inline"
                        >
                          {isMarking ? 'Marking...' : 'Attended'}
                        </span>
                      </Button>
                    </>
                  )}
                  {onRemove && (
                    <Button
                      onClick={() => onRemove(rsvp.id)}
                      disabled={isRemoving || isMarking}
                      variant="danger"
                      type="button"
                      size="sm"
                      title="Remove from RSVP list"
                      icon={<TrashSVG
                        className="size-4"
                      />}
                    >
                      <span
                        className="hidden sm:inline"
                      >
                        {isRemoving ? 'Removing…' : 'Remove'}
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
