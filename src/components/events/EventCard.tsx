import { RichDescription } from '@/components/shared/RichDescription';
import StackedAvatarsPopover, { type AvatarPerson } from '@/components/shared/StackedAvatarsPopover';
import type { EventAttendee } from '@/types/events';
import clsx from 'clsx';
import Link from 'next/link';

import BlurImage from '@/components/shared/BlurImage';
import { formatEventDate, formatEventTime } from '@/lib/events/format';
import { getEventStatus, type EventStatus } from '@/lib/events/status';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import TimeSVG from 'public/icons/time.svg';

export type EventCardData = {
  id: number;
  title: string | null;
  slug: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  cover_image?: string | null;
  image_blurhash?: string | null;
  description?: string | null;
};

// Transform attendees to AvatarPerson format
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

type EventCardVariant = 'compact' | 'detailed';

type EventCardProps = {
  event: EventCardData;
  /**
   * Visual variant
   * - 'compact': Horizontal layout with small thumbnail
   * - 'detailed': Coming soon - larger card with more info
   * @default 'compact'
   */
  variant?: EventCardVariant;
  /**
   * Show past/upcoming badge
   * @default false
   */
  showBadge?: boolean;
  /**
   * Right side slot for actions (buttons, badges, etc.)
   */
  rightSlot?: React.ReactNode;
  /**
   * Additional wrapper className
   */
  className?: string;
  /**
   * Whether this is a link to the event page
   * @default true
   */
  asLink?: boolean;
  /**
   * Description to display
   */
  description?: string | null;
  /**
   * Attendees to display
   */
  attendees?: EventAttendee[];
  /**
   * Disable popover on attendees (just show avatars + count)
   */
  disableAttendeesPopover?: boolean;
  /**
   * Server timestamp for determining if event is past.
   * REQUIRED when using Cache Components to avoid Date.now() during render.
   */
  serverNow?: number;
};

function getStatusLabel(status: EventStatus): string {
  switch (status) {
    case 'past':
      return 'Past';
    case 'now':
      return 'Happening now';
    case 'upcoming':
      return 'Upcoming';
  }
}

function EventStatusBadge({ status, size }: { status: EventStatus; size: 'sm' | 'md' }) {
  const label = getStatusLabel(status);
  const isSm = size === 'sm';
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium',
        isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        status === 'past' && 'bg-foreground/10 text-foreground/60',
        status === 'now' && 'bg-green-600 text-white',
        status === 'upcoming' && 'bg-primary text-white',
      )}
    >
      {status === 'now' && (
        <span
          className="size-1 shrink-0 rounded-full bg-white/90 animate-pulse"
          aria-hidden
        />
      )}
      {label}
    </span>
  );
}

/**
 * Unified event card component for displaying events across the app
 */
export default function EventCard({
  event,
  variant = 'compact',
  showBadge = false,
  rightSlot,
  className,
  asLink = true,
  attendees = [],
  disableAttendeesPopover = false,
  serverNow,
}: EventCardProps) {
  const status =
    serverNow !== undefined
      ? getEventStatus(event.date, event.time, serverNow)
      : 'upcoming';
  const imageSrc = event.cover_image;
  const attendeePeople = transformAttendeesToAvatarPeople(attendees);

  const cardContent = (
    <div
      className="sm:flex sm:items-start sm:gap-4"
    >
      {/* Mobile: Floating badge and thumbnail on right */}
      {imageSrc && (
        <div
          className="sm:hidden float-right ml-2 mb-1 flex flex-col items-end gap-1.5"
        >
          {showBadge && (
            <EventStatusBadge
              status={status}
              size="sm"
            />
          )}
          <div
            className="relative h-14 w-18 overflow-hidden rounded-md bg-background-light"
          >
            <BlurImage
              src={imageSrc}
              alt={event.title || 'Event cover'}
              sizes="72px"
              loading="lazy"
              quality={85}
              fill
              className="object-cover"
              blurhash={event.image_blurhash}
            />
          </div>
        </div>
      )}

      {/* Mobile: Badge only (when no image) */}
      {!imageSrc && showBadge && (
        <span
          className="sm:hidden float-right ml-2"
        >
          <EventStatusBadge
            status={status}
            size="sm"
          />
        </span>
      )}

      {/* Content */}
      <div
        className="sm:flex-1 sm:min-w-0"
      >
        <h4
          className="font-semibold group-hover:text-primary transition-colors leading-tight line-clamp-2 mb-1.5"
        >
          {event.title}
        </h4>

        <div
          className="flex flex-wrap gap-x-2 sm:gap-x-3 gap-y-1 mb-1 text-sm text-foreground/70"
        >
          {event.date && (
            <span
              className="flex items-center gap-1"
            >
              <CalendarSVG
                className="size-3.5 fill-foreground/60"
              />
              {formatEventDate(event.date)}
            </span>
          )}
          {event.time && (
            <span
              className="flex items-center gap-1"
            >
              <TimeSVG
                className="size-3.5 fill-foreground/60"
              />
              {formatEventTime(event.time)}
            </span>
          )}
          {event.location && (
            <span
              className="flex items-center gap-1"
            >
              <LocationSVG
                className="size-3.5 fill-foreground/60"
              />
              <span
                className="line-clamp-1"
              >
                {event.location.split('\n')[0]}
              </span>
            </span>
          )}
        </div>
        {/* Desktop: description in content area */}
        {event.description && (
          <RichDescription
            html={event.description}
            className="max-sm:hidden w-full max-w-[40ch] text-foreground/90 text-sm line-clamp-2"
          />
        )}

        {/* Attendees */}
        {attendees.length > 0 && (
          <div
            className="mt-3 max-sm:hidden"
          >
            <StackedAvatarsPopover
              people={attendeePeople}
              singularLabel="attendee"
              pluralLabel="attendees"
              showInlineCount={true}
              disablePopover={disableAttendeesPopover}
            />
          </div>
        )}
      </div>

      {/* Desktop: Badge and Thumbnail on right */}
      {imageSrc && (
        <div
          className="hidden sm:flex flex-col items-end gap-2 shrink-0"
        >
          {showBadge && (
            <EventStatusBadge
              status={status}
              size="md"
            />
          )}
          <div
            className="relative aspect-video w-44 overflow-hidden rounded-md bg-background-light"
          >
            <BlurImage
              src={imageSrc}
              alt={event.title || 'Event cover'}
              sizes="224px"
              loading="lazy"
              quality={85}
              fill
              className="object-cover"
              blurhash={event.image_blurhash}
            />
          </div>
        </div>
      )}

      {/* Desktop: Badge only (when no image) */}
      {!imageSrc && showBadge && (
        <span
          className="hidden sm:inline-flex shrink-0 self-start"
        >
          <EventStatusBadge
            status={status}
            size="md"
          />
        </span>
      )}

      {/* Right slot for actions */}
      {rightSlot && (
        <div
          className="shrink-0 flex items-center gap-2"
        >
          {rightSlot}
        </div>
      )}
    </div>
  );

  // Mobile: description below image and date/time
  const mobileDescription = event.description ? (
    <RichDescription
      html={event.description}
      className="sm:hidden mt-2 text-foreground/90 text-sm leading-snug line-clamp-3"
    />
  ) : null;

  const wrapperClasses = clsx(
    'block transition-colors group',
    // Mobile: borderless, no background. Desktop: card styling
    'sm:rounded-lg sm:border sm:border-border-color sm:bg-background',
    'max-sm:[&:not(:first-child)]:pt-6 max-sm:[&:not(:last-child)]:pb-6',
    'sm:p-4',
    asLink && 'sm:hover:border-primary cursor-pointer',
    className,
  );

  if (asLink && event.slug) {
    return (
      <Link
        href={`/events/${event.slug}`}
        className={wrapperClasses}
      >
        {cardContent}
        {mobileDescription}
        {/* Attendees */}
        {attendees.length > 0 && (
          <div
            className="mt-3 sm:hidden"
          >
            <StackedAvatarsPopover
              people={attendeePeople}
              singularLabel="attendee"
              pluralLabel="attendees"
              showInlineCount={true}
              maxVisibleAvatarsMobile={8}
              showCountOnMobile={true}
              disablePopover={disableAttendeesPopover}
            />
          </div>
        )}
      </Link>
    );
  }

  return (
    <div
      className={wrapperClasses}
    >
      {cardContent}
      {mobileDescription}
    </div>
  );
}
