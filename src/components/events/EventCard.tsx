import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';

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
  image_url?: string | null;
  description?: string | null;
};

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
  serverNow,
}: EventCardProps) {
  // Use serverNow if provided, otherwise assume client-side rendering
  const isPast = serverNow !== undefined ? isEventPast(event.date, serverNow) : false;
  const imageSrc = event.cover_image || event.image_url;

  const cardContent = (
    <div
      className="flex items-start gap-3 sm:gap-4"
    >
      {/* Thumbnail */}
      {(imageSrc || event.image_url) && (
        <div
          className="relative h-16 w-20 sm:h-22 sm:w-32 shrink-0 overflow-hidden rounded-md bg-background-light"
        >
          <Image
            src={imageSrc || event.image_url || ''}
            alt={event.title || 'Event cover'}
            sizes="256px"
            loading="lazy"
            quality={85}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div
        className="flex-1 min-w-0"
      >
        <div
          className="flex items-start justify-between gap-2 mb-1.5"
        >
          <h4
            className="font-semibold group-hover:text-primary transition-colors leading-tight line-clamp-2"
          >
            {event.title}
          </h4>
          {showBadge && (
            <span
              className={clsx(
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                isPast
                  ? 'bg-foreground/10 text-foreground/60'
                  : 'bg-primary text-white',
              )}
            >
              {isPast ? 'Past' : 'Upcoming'}
            </span>
          )}
        </div>

        <div
          className="flex flex-wrap gap-x-3 gap-y-1 mb-1 text-sm text-foreground/70"
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
              className="hidden sm:flex items-center gap-1"
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
            className="max-sm:hidden w-full max-w-[50ch] text-foreground/90 text-sm line-clamp-3"
          >
            {event.description}
          </p>
        )}
      </div>

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
    'block rounded-lg border border-border-color bg-background p-3 sm:p-4 transition-colors group',
    asLink && 'hover:border-primary cursor-pointer',
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
