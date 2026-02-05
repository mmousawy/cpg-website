import StackedAvatarsPopover, { type AvatarPerson } from '@/components/shared/StackedAvatarsPopover';
import type { EventAttendee } from '@/types/events';
import clsx from 'clsx';
import crypto from 'crypto';
import Link from 'next/link';

import BlurImage from '@/components/shared/BlurImage';

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
    const customAvatar = attendee.profiles?.avatar_url;
    const gravatarUrl = `https://gravatar.com/avatar/${crypto.createHash('md5').update(attendee.email || '').digest('hex')}?s=64`;
    return {
      id: attendee.id.toString(),
      avatarUrl: customAvatar || gravatarUrl,
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

/**
 * Check if an event date is in the past
 * @param date - Event date string
 * @param now - Current timestamp. REQUIRED for server components with Cache Components.
 *              Optional for client components (defaults to Date.now()).
 */
export function isEventPast(date: string | null, now?: number): boolean {
  if (!date) return false;
  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);
  // Client components can use the default; server components must pass now
  const nowDate = new Date(now ?? Date.now());
  nowDate.setHours(0, 0, 0, 0);
  return eventDate < nowDate;
}

/**
 * Format event date for display
 */
export function formatEventDate(
  date: string,
  options: { includeYear?: boolean } = {},
): string {
  const { includeYear = false } = options;
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(includeYear && { year: 'numeric' }),
  });
}

/**
 * Format event time for display (HH:MM)
 */
export function formatEventTime(time: string): string {
  return time.substring(0, 5);
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
  // Use serverNow if provided, otherwise assume client-side rendering
  const isPast = serverNow !== undefined ? isEventPast(event.date, serverNow) : false;
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
            <span
              className={clsx(
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                isPast
                  ? 'bg-foreground/10 text-foreground/60'
                  : 'bg-primary text-white',
              )}
            >
              {isPast ? 'Past' : 'Upcoming'}
            </span>
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
          className={clsx(
            'sm:hidden float-right ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            isPast
              ? 'bg-foreground/10 text-foreground/60'
              : 'bg-primary text-white',
          )}
        >
          {isPast ? 'Past' : 'Upcoming'}
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
          <p
            className="max-sm:hidden w-full max-w-[40ch] text-foreground/90 text-sm line-clamp-2"
          >
            {event.description}
          </p>
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
            <span
              className={clsx(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                isPast
                  ? 'bg-foreground/10 text-foreground/60'
                  : 'bg-primary text-white',
              )}
            >
              {isPast ? 'Past' : 'Upcoming'}
            </span>
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
          className={clsx(
            'hidden sm:inline-flex shrink-0 self-start rounded-full px-2 py-0.5 text-xs font-medium',
            isPast
              ? 'bg-foreground/10 text-foreground/60'
              : 'bg-primary text-white',
          )}
        >
          {isPast ? 'Past' : 'Upcoming'}
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
    <p
      className="sm:hidden mt-2 text-foreground/90 text-sm leading-snug line-clamp-3"
    >
      {event.description}
    </p>
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
