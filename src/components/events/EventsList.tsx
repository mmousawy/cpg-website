import BlurImage from '@/components/shared/BlurImage';
import Button from '@/components/shared/Button';
import { RichDescription } from '@/components/shared/RichDescription';
import StackedAvatarsPopover, { type AvatarPerson } from '@/components/shared/StackedAvatarsPopover';
import type { CPGEvent, EventAttendee } from '@/types/events';
import clsx from 'clsx';
import Link from 'next/link';

import { formatEventDate, formatEventTime, getDateSortValue } from '@/lib/events/format';
import { getEventStatus, isEventPast } from '@/lib/events/status';
import { getCroppedThumbnailUrl } from '@/utils/supabaseImageLoader';
import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import SadSVG from 'public/icons/sad.svg';
import TimeSVG from 'public/icons/time.svg';
import { SIZE_MAP } from '../auth/Avatar';
import EventCard from './EventCard';
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
        className='text-sm font-semibold text-foreground/80 leading-6'
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
        const aDate = getDateSortValue(a.date);
        const bDate = getDateSortValue(b.date);
        const aIsPast = isEventPast(a.date, serverNow, a.time);
        const bIsPast = isEventPast(b.date, serverNow, b.time);

        // Upcoming events come first
        if (!aIsPast && bIsPast) return -1;
        if (aIsPast && !bIsPast) return 1;

        // Both upcoming: soonest first (ascending)
        if (!aIsPast && !bIsPast) {
          return aDate - bDate;
        }

        // Both past: most recent first (descending)
        return bDate - aDate;
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
        className="space-y-3 sm:space-y-5"
      >
        {displayEvents.map((event, index) => {
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
              priority={index === 0}
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
              'rounded-xl border bg-background-light border-border-color overflow-hidden',
            )}
          >
            {/* Mobile image - flush to top edges with status tag overlay */}
            {event.cover_image && (
              <Link
                href={`/events/${event.slug}`}
                className="relative block sm:hidden aspect-[21/9]"
                tabIndex={-1}
              >
                <BlurImage
                  fill
                  sizes="100vw"
                  loading='eager'
                  quality={92}
                  alt={event.title || 'Event cover image'}
                  className={clsx(
                    'object-cover rounded-t-xl hover:brightness-90 transition-all duration-200',
                    isPast && '',
                  )}
                  src={getCroppedThumbnailUrl(event.cover_image, 640, 360) || event.cover_image}
                  blurhash={event.image_blurhash}
                />
                <span
                  className={clsx(
                    'absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap shadow-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]',
                    status === 'past' && 'bg-black/50 text-white backdrop-blur-sm',
                    status === 'now' && 'bg-green-600/80 text-white backdrop-blur-sm',
                    status === 'upcoming' && 'bg-primary/80 text-white backdrop-blur-sm',
                  )}
                >
                  {status === 'past' ? 'Past event' : status === 'now' ? 'Happening now' : 'Upcoming'}
                </span>
              </Link>
            )}
            <div
              className="flex sm:flex-row flex-col"
            >
              {/* Content side */}
              <div
                className="flex-1 min-w-0 p-4 sm:p-6"
              >
                <div
                  className='mb-5 sm:mb-6'
                >
                  <Link
                    href={`/events/${event.slug}`}
                    className="group"
                  >
                    <h3
                      className={clsx(
                        'text-xl sm:text-2xl font-bold transition-colors md:max-w-140',
                        isPast
                          ? 'text-foreground/80 group-hover:text-foreground/90'
                          : 'group-hover:text-primary',
                      )}
                    >
                      {event.title}
                    </h3>
                  </Link>
                </div>
                <div>
                  <span
                    className='mb-1 sm:mb-2 flex gap-5 sm:gap-4 text-[15px] font-semibold leading-6'
                  >
                    <span
                      className='flex gap-2'
                    >
                      <CalendarSVG
                        className="shrink-0 fill-foreground"
                      />
                      {formatEventDate(event.date!, { includeYear: true })}
                    </span>
                    <span
                      className='flex gap-2'
                    >
                      <TimeSVG
                        className="shrink-0 fill-foreground"
                      />
                      {event.time ? formatEventTime(event.time) : ''}
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
                    className='mb-5 flex items-start gap-2 whitespace-pre-wrap text-[15px] font-semibold sm:hidden'
                  >
                    <LocationSVG
                      className="shrink-0 fill-foreground"
                    />
                    {event.location}
                  </span>
                  <RichDescription
                    html={event.description ?? ''}
                    className="whitespace-pre-line line-clamp-5 text-[15px]"
                  />
                </div>
                <div
                  className='mt-5 sm:mt-8 flex items-end justify-between gap-5 sm:gap-4'
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
                    aria-label={`View event: ${event.title}`}
                  >
                    View event
                  </Button>
                </div>
              </div>
              {/* Image side - flush to top, right, bottom */}
              {event.cover_image && (
                <Link
                  href={`/events/${event.slug}`}
                  className="relative w-72 lg:w-80 shrink-0 max-sm:hidden"
                  tabIndex={-1}
                >
                  <BlurImage
                    fill
                    sizes="(min-width: 1024px) 640px, 576px"
                    loading='eager'
                    quality={92}
                    alt={event.title || 'Event cover image'}
                    className={clsx(
                      'object-cover rounded-r-xl hover:brightness-90 transition-all duration-200',
                      isPast && '',
                    )}
                    src={getCroppedThumbnailUrl(event.cover_image, 640, 480) || event.cover_image}
                    blurhash={event.image_blurhash}
                  />
                  <span
                    className={clsx(
                      'absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap shadow-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]',
                      status === 'past' && 'bg-black/50 text-white backdrop-blur-sm',
                      status === 'now' && 'bg-green-600/80 text-white backdrop-blur-sm',
                      status === 'upcoming' && 'bg-primary/80 text-white backdrop-blur-sm',
                    )}
                  >
                    {status === 'past' ? 'Past event' : status === 'now' ? 'Happening now' : 'Upcoming'}
                  </span>
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
