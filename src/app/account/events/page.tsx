'use client';

import { useEffect, useState } from 'react';

import { formatEventDate, formatEventTime, isEventPast } from '@/components/events/EventCard';
import PageContainer from '@/components/layout/PageContainer';
import BlurImage from '@/components/shared/BlurImage';
import Button from '@/components/shared/Button';
import HelpLink from '@/components/shared/HelpLink';
import type { Tables } from '@/database.types';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import Link from 'next/link';

import { routes } from '@/config/routes';
import ArrowRightSVG from 'public/icons/arrow-right.svg';
import CalendarSVG from 'public/icons/calendar2.svg';
import CancelSVG from 'public/icons/cancel.svg';
import CheckSVG from 'public/icons/check.svg';
import LocationSVG from 'public/icons/location.svg';
import SadSVG from 'public/icons/sad.svg';
import TimeSVG from 'public/icons/time.svg';

// RSVP with joined event data - use non-null date since we filter for valid events
type RSVP = Pick<Tables<'events_rsvps'>, 'id' | 'uuid' | 'confirmed_at' | 'canceled_at' | 'attended_at' | 'created_at'> & {
  events: Omit<Pick<Tables<'events'>, 'id' | 'title' | 'slug' | 'date' | 'time' | 'location' | 'cover_image' | 'description'>, 'date'> & {
    date: string  // Non-null since we only show events with valid dates
  }
}

export default function MyEventsPage() {
  // User is guaranteed by ProtectedRoute layout
  const { user } = useAuth();
  const supabase = useSupabase();

  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Compute once on mount to avoid React Compiler purity warning
  const [sevenDaysAgo] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    // User is guaranteed by ProtectedRoute layout
    if (!user) return;

    const loadRSVPs = async () => {
      try {
        const { data, error } = await supabase
          .from('events_rsvps')
          .select(`
            id,
            uuid,
            confirmed_at,
            canceled_at,
            attended_at,
            created_at,
            events (
              id,
              title,
              slug,
              date,
              time,
              location,
              cover_image,
              description
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading RSVPs:', error);
        } else {
          setRsvps((data as unknown as RSVP[]) || []);
        }
      } catch (err) {
        console.error('Unexpected error loading RSVPs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRSVPs();
  }, [user]);

  // Sort: upcoming (soonest first), past (most recent first)
  const upcomingRSVPs = rsvps
    .filter(r => !r.canceled_at && r.events && !isEventPast(r.events.date, undefined, r.events.time))
    .sort((a, b) => new Date(a.events.date).getTime() - new Date(b.events.date).getTime());
  const pastRSVPs = rsvps
    .filter(r => !r.canceled_at && r.events && isEventPast(r.events.date, undefined, r.events.time))
    .sort((a, b) => new Date(b.events.date).getTime() - new Date(a.events.date).getTime());
  const canceledRSVPs = rsvps.filter(r => r.canceled_at);

  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <div
          className="flex items-center gap-2 mb-2"
        >
          <h1
            className="text-3xl font-bold"
          >
            My events
          </h1>
          <HelpLink
            href="rsvp"
            label="Help with events and RSVP"
          />
        </div>
        <p
          className="text-base sm:text-lg opacity-70"
        >
          View and manage your event registrations
        </p>
      </div>

      {/* No-JS fallback */}
      <noscript>
        <style>
          {'.js-loading { display: none !important; }'}
        </style>
        <div
          className="text-center py-12"
        >
          <p
            className="text-lg font-medium mb-2"
          >
            JavaScript required
          </p>
          <p
            className="text-foreground/70"
          >
            Please enable JavaScript to view your event registrations.
          </p>
        </div>
      </noscript>

      <div
        className="space-y-10"
      >
        {/* Upcoming Events */}
        <section>
          <h2
            className="mb-4 text-lg font-semibold opacity-70"
          >
            Your upcoming events
          </h2>
          {isLoading ? (
            <div
              className="text-center animate-pulse js-loading py-12"
            >
              <p
                className="text-foreground/50"
              >
                Loading your events...
              </p>
            </div>
          ) : upcomingRSVPs.length === 0 ? (
            <div
              className="text-center py-8 rounded-xl border border-dashed border-border-color"
            >
              <p
                className="text-foreground/80"
              >
                <SadSVG
                  className="inline align-top h-6 w-6 mr-2 fill-foreground/80"
                />
                {' '}
                No upcoming events
              </p>
              <Button
                href={routes.events.url}
                size='sm'
                iconRight={<ArrowRightSVG
                  className="-mr-1.5"
                />}
                className="mt-4 rounded-full"
              >
                Browse events
              </Button>
            </div>
          ) : (
            <div
              className="space-y-3"
            >
              {upcomingRSVPs.map((rsvp) => (
                <RsvpEventCard
                  key={rsvp.id}
                  rsvp={rsvp}
                />
              ))}
            </div>
          )}
        </section>

        {/* Past Events */}
        {pastRSVPs.length > 0 && (
          <section>
            <h2
              className="mb-4 text-lg font-semibold opacity-70"
            >
              Past events
            </h2>
            <div
              className="space-y-3"
            >
              {pastRSVPs.map((rsvp) => (
                <RsvpEventCard
                  key={rsvp.id}
                  rsvp={rsvp}
                  isPast
                  sevenDaysAgo={sevenDaysAgo}
                />
              ))}
            </div>
          </section>
        )}

        {/* Canceled Events */}
        {canceledRSVPs.length > 0 && (
          <section>
            <h2
              className="mb-4 text-lg font-semibold opacity-70"
            >
              Canceled RSVPs
            </h2>
            <div
              className="space-y-3"
            >
              {canceledRSVPs.map((rsvp) => (
                <RsvpEventCard
                  key={rsvp.id}
                  rsvp={rsvp}
                  isCanceled
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageContainer>
  );
}

function RsvpEventCard({
  rsvp,
  isPast,
  isCanceled,
  sevenDaysAgo,
}: {
  rsvp: RSVP
  isPast?: boolean
  isCanceled?: boolean
  sevenDaysAgo?: number
}) {
  const event = rsvp.events;

  if (!event) return null;

  // Check if event is within 7 days of now (for pending confirmation display)
  const isWithinSevenDays = sevenDaysAgo
    ? new Date(event.date) > new Date(sevenDaysAgo)
    : false;

  // Determine the status badge - only show for past events (attended/not attended) or canceled
  const statusBadge = isCanceled ? (
    <span
      className="flex items-center gap-1 w-fit rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500 whitespace-nowrap"
    >
      <CancelSVG
        className="h-3 w-3 fill-red-500"
      />
      Canceled
    </span>
  ) : isPast ? (
    rsvp.attended_at ? (
      <span
        className="flex w-fit items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary whitespace-nowrap"
      >
        <CheckSVG
          className="h-3 w-3 fill-primary"
        />
        Attended
      </span>
    ) : isWithinSevenDays ? (
      <span
        className="flex items-center gap-1 w-fit rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-600 whitespace-nowrap"
      >
        Pending confirmation
      </span>
    ) : (
      <span
        className="flex items-center gap-1 w-fit rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium text-foreground/60 whitespace-nowrap"
      >
        Not attended
      </span>
    )
  ) : (
    <span
      className="flex items-center gap-1 w-fit rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 whitespace-nowrap"
    >
      <CheckSVG
        className="h-3 w-3 fill-green-600"
      />
      You&apos;re going!
    </span>
  );

  const cardClassName = 'rounded-lg border border-border-color bg-background-light p-4 transition-colors hover:border-primary';

  // Consistent card layout for all states
  return (
    <div
      className={cardClassName}
    >
      <Link
        href={event.slug ? `/events/${event.slug}` : '#'}
        className="block group"
      >
        <div
          className="sm:flex sm:items-start sm:gap-4"
        >
          {/* Content */}
          <div
            className="sm:flex-1 sm:min-w-0"
          >
            {/* Mobile: float badge and thumbnail to the right */}
            {(statusBadge || event.cover_image) && (
              <div
                className="sm:hidden float-right ml-2 mb-1 flex flex-col items-end gap-1.5"
              >
                {statusBadge}
                {event.cover_image && (
                  <div
                    className="relative aspect-video w-18 overflow-hidden rounded-md bg-background"
                  >
                    <BlurImage
                      src={event.cover_image}
                      alt={event.title || 'Event cover'}
                      sizes="72px"
                      loading="lazy"
                      quality={85}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            )}
            <div
              className="mb-1.5"
            >
              <h4
                className="font-semibold group-hover:text-primary transition-colors leading-tight line-clamp-2"
              >
                {event.title}
              </h4>
              {statusBadge && (
                <div
                  className="max-sm:hidden mt-1.5"
                >
                  {statusBadge}
                </div>
              )}
            </div>
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
            {event.description && (
              <p
                className="max-sm:hidden max-w-[50ch] text-foreground/90 text-sm line-clamp-3"
              >
                {event.description}
              </p>
            )}
          </div>
          {/* Right side: thumbnail only (badge is now below title) */}
          {event.cover_image && (
            <div
              className="hidden sm:block shrink-0"
            >
              <div
                className="relative aspect-video w-44 overflow-hidden rounded-md bg-background"
              >
                <BlurImage
                  src={event.cover_image}
                  alt={event.title || 'Event cover'}
                  sizes="176px"
                  loading="lazy"
                  quality={85}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
