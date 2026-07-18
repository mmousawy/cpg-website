import { RichDescription } from '@/components/shared/RichDescription';
import StackedAvatarsPopover, { type AvatarPerson } from '@/components/shared/StackedAvatarsPopover';
import type { EventAttendee } from '@/types/events';
import clsx from 'clsx';
import Link from 'next/link';

import BlurImage from '@/components/shared/BlurImage';
import { formatEventDate, formatEventTime } from '@/lib/events/format';
import { getEventStatus, type EventStatus } from '@/lib/events/status';
import { getCroppedThumbnailUrl, THUMBNAIL_IMAGE_QUALITY } from '@/utils/supabaseImageLoader';

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

function formatLocationDisplay(location: string): string {
  const lines = location
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return location.trim();
  }

  const venue = lines[0];
  const lastLine = lines[lines.length - 1] || '';
  const city = lastLine.replace(/^\d{4}\s?[A-Za-z]{2}\s+/i, '').trim();

  if (!city || venue.toLocaleLowerCase().includes(city.toLocaleLowerCase())) {
    return venue;
  }

  return `${venue}, ${city}`;
}

type EventCardVariant = 'compact' | 'detailed';

type EventCardProps = {
  event: EventCardData;
  variant?: EventCardVariant;
  showBadge?: boolean;
  rightSlot?: React.ReactNode;
  className?: string;
  asLink?: boolean;
  description?: string | null;
  attendees?: EventAttendee[];
  disableAttendeesPopover?: boolean;
  serverNow?: number;
  /** Prioritize loading for LCP (first visible event card on homepage) */
  priority?: boolean;
};

function getStatusLabel(status: EventStatus): string {
  switch (status) {
    case 'past':
      return 'Past event';
    case 'now':
      return 'Happening now';
    case 'upcoming':
      return 'Upcoming';
  }
}

function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={clsx(
        'absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shadow-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]',
        status === 'past' && 'bg-black/50 text-white backdrop-blur-sm',
        status === 'now' && 'bg-green-600/80 text-white backdrop-blur-sm',
        status === 'upcoming' && 'bg-primary/80 text-white backdrop-blur-sm',
      )}
    >
      {status === 'now' && (
        <span
          className="size-1 shrink-0 rounded-full bg-white/90 animate-pulse"
          aria-hidden
        />
      )}
      {getStatusLabel(status)}
    </span>
  );
}

export default function EventCard({
  event,
  showBadge = false,
  rightSlot,
  className,
  asLink = true,
  attendees = [],
  disableAttendeesPopover = false,
  serverNow,
  priority = false,
}: EventCardProps) {
  const status =
    serverNow !== undefined
      ? getEventStatus(event.date, event.time, serverNow)
      : 'upcoming';
  const isPast = status === 'past';
  const imageSrc = event.cover_image;
  const imageQuality = THUMBNAIL_IMAGE_QUALITY;
  const attendeePeople = transformAttendeesToAvatarPeople(attendees);

  const wrapperClasses = clsx(
    'block transition-colors group overflow-hidden',
    'rounded-xl border border-border-color bg-background-light',
    asLink && 'hover:border-primary cursor-pointer',
    className,
  );

  const content = (
    <>
      {/* Mobile: image on top, edge-to-edge */}
      {imageSrc && (
        <div
          className="relative sm:hidden aspect-21/9"
        >
          <BlurImage
            fill
            sizes="100vw"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            preload={priority}
            quality={imageQuality}
            alt={event.title || 'Event cover image'}
            className={clsx(
              'object-cover rounded-t-xl',
              isPast && '',
            )}
            src={getCroppedThumbnailUrl(imageSrc, 640, 274) || imageSrc}
            blurhash={event.image_blurhash}
          />
          {showBadge && (
            <EventStatusBadge
              status={status}
            />
          )}
        </div>
      )}

      <div
        className="flex sm:flex-row flex-col"
      >
        {/* Content */}
        <div
          className="flex-1 min-w-0 p-4 sm:p-5"
        >
          {/* Mobile: badge inline when no image */}
          {!imageSrc && showBadge && (
            <div
              className="sm:hidden mb-2"
            >
              <span
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                  status === 'past' && 'bg-foreground/10 text-foreground/60',
                  status === 'now' && 'bg-green-600 text-white',
                  status === 'upcoming' && 'bg-primary text-white',
                )}
              >
                {getStatusLabel(status)}
              </span>
            </div>
          )}

          <h3
            className={clsx(
              'text-lg font-semibold leading-tight line-clamp-2 mb-3 transition-colors',
              isPast ? 'text-foreground/80' : 'group-hover:text-primary',
            )}
          >
            {event.title}
          </h3>

          <div
            className="flex flex-wrap gap-x-3 gap-y-1 mb-3 text-sm text-foreground/80"
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
                  {formatLocationDisplay(event.location)}
                </span>
              </span>
            )}
          </div>

          {event.description && (
            <RichDescription
              html={event.description}
              className="text-foreground/90 text-sm line-clamp-3"
              disableLinks
            />
          )}

          {attendees.length > 0 && (
            <div
              className="mt-4"
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
        </div>

        {/* Desktop: image on right, flush to edges */}
        {imageSrc && (
          <div
            className="relative w-48 lg:w-56 shrink-0 max-sm:hidden"
          >
            <BlurImage
              fill
              sizes="(min-width: 1024px) 448px, 384px"
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : undefined}
              preload={priority}
              quality={imageQuality}
              alt={event.title || 'Event cover image'}
              className={clsx(
                'object-cover rounded-r-xl',
                isPast && '',
              )}
              src={getCroppedThumbnailUrl(imageSrc, 448, 336) || imageSrc}
              blurhash={event.image_blurhash}
            />
            {showBadge && (
              <EventStatusBadge
                status={status}
              />
            )}
          </div>
        )}

        {/* Desktop: badge only (when no image) */}
        {!imageSrc && showBadge && (
          <span
            className="hidden sm:inline-flex shrink-0 self-start m-3"
          >
            <span
              className={clsx(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                status === 'past' && 'bg-foreground/10 text-foreground/60',
                status === 'now' && 'bg-green-600 text-white',
                status === 'upcoming' && 'bg-primary text-white',
              )}
            >
              {getStatusLabel(status)}
            </span>
          </span>
        )}

        {rightSlot && (
          <div
            className="shrink-0 flex items-center gap-2 p-3"
          >
            {rightSlot}
          </div>
        )}
      </div>
    </>
  );

  if (asLink && event.slug) {
    return (
      <Link
        href={`/events/${event.slug}`}
        className={wrapperClasses}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={wrapperClasses}
    >
      {content}
    </div>
  );
}
