import StackedAvatarsPopover, { type AvatarPerson } from '@/components/shared/StackedAvatarsPopover';
import type { CPGEvent, EventAttendee } from '@/types/events';
import { stripHtml } from '@/utils/stripHtml';
import clsx from 'clsx';
import Link from 'next/link';

import Button from '@/components/shared/Button';
import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import SadSVG from 'public/icons/sad.svg';
import TimeSVG from 'public/icons/time.svg';
import { SIZE_MAP } from '../auth/Avatar';
import EventCard, { getEventStatus, isEventPast } from './EventCard';
import EventImage from './EventImage';

type EventsListVariant = 'full' | 'compact';

type EventsListProps = {
  events: CPGEvent[]
  attendeesByEvent?: Record<number, EventAttendee[]>
  emptyMessage?: string
  /**
   * Visual variant
   * - 'full': Detailed cards with description, image, and actions (for /events page)
   * - 'compact': Smaller cards with EventCard component (for homepage)
   * @default 'full'
   */
  variant?: EventsListVariant
  /**
   * Maximum number of events to display (for compact variant)
   */
  max?: number
  /**
   * Disable attendees popover in compact variant (just show avatars + count)
   */
  disableAttendeesPopover?: boolean
  /**
   * Server timestamp for determining if events are past.
   * REQUIRED when using Cache Components to avoid Date.now() during render.
   */
  serverNow: number
  /**
   * Size of the avatars
   */
  avatarSize?: keyof typeof SIZE_MAP
}

// Transform attendees to AvatarPerson format for the shared component
function transformAttendeesToAvatarPeople(attendees: EventAttendee[]): AvatarPerson[] {
  return attendees.map((attendee) => {
    return {
      id: attendee.id.toString(),
      avatarUrl: attendee.profiles?.avatar_url || null,
      fullName: attendee.profiles?.full_name || null,
      nickname: attendee.profiles?.nickname || null,
    };
  });
}

// Inline attendees display component using shared StackedAvatarsPopover
function AttendeesDisplay({ attendees, isPastEvent, avatarSize }: { attendees: EventAttendee[], isPastEvent: boolean, avatarSize: keyof typeof SIZE_MAP | undefined }) {
  if (!attendees || attendees.length === 0) {
    return (
      <div
        className='text-sm font-semibold text-foreground/70 leading-6'
      >
        {isPastEvent ? 'No attendees recorded' : 'No attendees yet — join and be the first!'}
      </div>
    );
  }

  const attendeePeople = transformAttendeesToAvatarPeople(attendees);

  return (
    <StackedAvatarsPopover
      people={attendeePeople}
      singularLabel="attendee"
      pluralLabel="attendees"
      emptyMessage={isPastEvent ? 'No attendees recorded' : 'No attendees yet'}
      showInlineCount={true}
      avatarSize={avatarSize}
    />
  );
}

export default function EventsList({
  events,
  attendeesByEvent = {},
  emptyMessage,
  variant = 'full',
  max,
  disableAttendeesPopover = false,
  serverNow,
  avatarSize = 'xxs',
}: EventsListProps) {
  if (!events || events.length === 0) {
    return (
      <div
        className="text-center py-8 rounded-xl border border-dashed border-border-color"
      >
        <p
          className="text-foreground/80"
        >
          <SadSVG
            className="inline align-top h-6 w-6 mr-2 fill-foreground/80"
          />
          {emptyMessage || 'No events found'}
        </p>
      </div>
    );
  }

  // Sort events for compact variant: upcoming first (soonest), then past (most recent)
  let displayEvents = events;
  if (variant === 'compact') {
    displayEvents = [...events]
      .sort((a, b) => {
        const aDate = a.date ? new Date(a.date) : null;
        const bDate = b.date ? new Date(b.date) : null;
        const aIsPast = isEventPast(a.date, serverNow, a.time);
        const bIsPast = isEventPast(b.date, serverNow, b.time);

        // Upcoming events come first
        if (!aIsPast && bIsPast) return -1;
        if (aIsPast && !bIsPast) return 1;

        // Both upcoming: soonest first (ascending)
        if (!aIsPast && !bIsPast) {
          return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
        }

        // Both past: most recent first (descending)
        return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
      });
  }

  // Apply max limit if specified
  if (max) {
    displayEvents = displayEvents.slice(0, max);
  }

  // Compact variant: use EventCard component
  if (variant === 'compact') {
    return (
      <div
        className="divide-y divide-border-color sm:divide-y-0 sm:space-y-3"
      >
        {displayEvents.map((event) => {
          const attendees = attendeesByEvent[event.id] || [];
          return (
            <EventCard
              key={event.id}
              event={event}
              showBadge
              description={event.description}
              attendees={attendees}
              disableAttendeesPopover={disableAttendeesPopover}
              serverNow={serverNow}
            />
          );
        })}
      </div>
    );
  }

  // Full variant: detailed cards
  return (
    <>
      {displayEvents.map((event) => {
        const status = getEventStatus(event.date, event.time, serverNow);
        const isPast = status === 'past';
        const attendees = attendeesByEvent[event.id] || [];

        return (
          <div
            key={event.id}
            className={clsx(
              'rounded-xl border bg-background-light p-4 sm:p-6 border-border-color',
            )}
          >
            <div
              className={clsx(isPast && 'grayscale', 'sm:hidden')}
            >
              <EventImage
                event={event}
                size='small'
              />
            </div>
            <div
              className='mb-6 flex justify-between'
            >
              <div
                className="flex-1"
              >
                {(status === 'past' || status === 'now') && (
                  <div
                    className="flex items-center gap-2 mb-1"
                  >
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                        status === 'past' && 'bg-foreground/10 text-foreground/60',
                        status === 'now' && 'bg-green-600 text-white',
                      )}
                    >
                      {status === 'past' ? 'Past event' : 'Happening now'}
                    </span>
                  </div>
                )}
                <Link
                  href={`/events/${event.slug}`}
                  className="group"
                >
                  <h3
                    className={clsx(
                      'text-2xl font-bold transition-colors md:max-w-140',
                      isPast
                        ? 'text-foreground/70 group-hover:text-foreground/90'
                        : 'group-hover:text-primary',
                    )}
                  >
                    {event.title}
                  </h3>
                </Link>
              </div>
              <Button
                href={`/events/${event.slug}`}
                tabIndex={-1}
                variant={isPast ? 'secondary' : 'primary'}
                size="sm"
                className="ml-2 max-sm:hidden self-start"
              >
                View event
              </Button>
            </div>
            <div
              className='flex gap-6'
            >
              <div>
                <span
                  className='mb-2 flex gap-4 text-[15px] font-semibold leading-6 max-sm:mb-2'
                >
                  <span
                    className='flex gap-2'
                  >
                    <CalendarSVG
                      className="shrink-0 fill-foreground"
                    />
                    {new Date(event.date!).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span
                    className='flex gap-2'
                  >
                    <TimeSVG
                      className="shrink-0 fill-foreground"
                    />
                    {event.time?.substring(0, 5)}
                  </span>
                </span>
                <span
                  className='mb-6 flex items-start gap-2 whitespace-pre-wrap text-[15px] font-semibold leading-6 max-sm:hidden'
                >
                  <LocationSVG
                    className="shrink-0 fill-foreground"
                  />
                  {event.location?.split('\n')[0] ?? ''}
                </span>
                <span
                  className='mb-6 flex items-start gap-2 whitespace-pre-wrap text-[15px] font-semibold max-sm:mb-6 sm:hidden'
                >
                  <LocationSVG
                    className="shrink-0 fill-foreground"
                  />
                  {event.location}
                </span>
                <p
                  className='whitespace-pre-line line-clamp-5'
                >
                  {stripHtml(event.description ?? '')}
                </p>
              </div>
              <EventImage
                event={event}
                tabIndex={-1}
              />
            </div>
            <div
              className='mt-8 flex items-end justify-between gap-4'
            >
              <AttendeesDisplay
                attendees={attendees}
                isPastEvent={isPast}
                avatarSize="xs"
              />
              <Button
                href={`/events/${event.slug}`}
                variant={isPast ? 'secondary' : 'primary'}
                size="md"
                className="ml-2 self-end sm:hidden"
              >
                View event
              </Button>
            </div>
          </div>
        );
      })}
    </>
  );
}
