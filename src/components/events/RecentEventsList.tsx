import Link from 'next/link';
import Image from 'next/image';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import TimeSVG from 'public/icons/time.svg';

interface Event {
  id: number
  title: string | null
  date: string | null
  location: string | null
  time: string | null
  cover_image: string | null
  image_url: string | null
  slug: string | null
}

interface RecentEventsListProps {
  events: Event[]
}

export default function RecentEventsList({ events }: RecentEventsListProps) {
  if (!events || events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-color p-6 text-center">
        <p className="text-foreground/70">No events yet. Check back soon!</p>
      </div>
    );
  }

  // Check which events are past/upcoming
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const eventsWithStatus = events.map((event) => {
    const eventDate = event.date ? new Date(event.date) : null;
    if (eventDate) eventDate.setHours(0, 0, 0, 0);
    const isPast = eventDate ? eventDate < now : false;

    return { ...event, isPast };
  });

  return (
    <div className="space-y-3">
      {eventsWithStatus.map((event) => (
        <Link
          key={event.id}
          href={`/events/${event.slug}`}
          className="block rounded-xl border border-border-color bg-background p-3 sm:p-4 transition-colors hover:border-primary group"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Thumbnail */}
            {(event.cover_image || event.image_url) && (
              <div className="relative h-16 w-24 sm:h-20 sm:w-32 shrink-0 overflow-hidden rounded-lg bg-background-light">
                <Image
                  src={event.cover_image || event.image_url!}
                  alt={event.title || 'Event cover'}
                  sizes="128px"
                  loading='eager'
                  quality={95}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h4 className="font-semibold group-hover:text-primary transition-colors line-clamp-3">
                  {event.title}
                </h4>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  event.isPast
                    ? 'bg-foreground/10 text-foreground/60'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {event.isPast ? 'Past' : 'Upcoming'}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground/70">
                {event.date && (
                  <span className="flex items-center gap-1">
                    <CalendarSVG className="size-3.5 fill-foreground/60" />
                    {new Date(event.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
                {event.time && (
                  <span className="flex items-center gap-1">
                    <TimeSVG className="size-3.5 fill-foreground/60" />
                    {event.time.substring(0, 5)}
                  </span>
                )}
                {event.location && (
                  <span className="hidden sm:flex items-center gap-1">
                    <LocationSVG className="size-3.5 fill-foreground/60" />
                    <span className="line-clamp-1">{event.location.split('\n')[0]}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
