'use client';

import { useEffect, useState } from 'react';

import EventCard, { isEventPast, type EventCardData } from '@/components/events/EventCard';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import HelpLink from '@/components/shared/HelpLink';
import type { Tables } from '@/database.types';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';

import { routes } from '@/config/routes';
import ArrowRightSVG from 'public/icons/arrow-right.svg';
import CancelSVG from 'public/icons/cancel.svg';
import CheckSVG from 'public/icons/check.svg';
import SadSVG from 'public/icons/sad.svg';

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
              className="space-y-3 opacity-40"
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
      className="flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500 whitespace-nowrap"
    >
      <CancelSVG
        className="h-3 w-3 fill-red-500"
      />
      Canceled
    </span>
  ) : isPast ? (
    rsvp.attended_at ? (
      <span
        className="flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 whitespace-nowrap"
      >
        <CheckSVG
          className="h-3 w-3 fill-green-600"
        />
        Attended
      </span>
    ) : isWithinSevenDays ? (
      <span
        className="flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-600 whitespace-nowrap"
      >
        Pending confirmation
      </span>
    ) : (
      <span
        className="flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium text-foreground/60 whitespace-nowrap"
      >
        Not attended
      </span>
    )
  ) : null; // No badge for upcoming events - they're all confirmed by default

  const cardClassName = 'rounded-lg border border-border-color bg-background-light p-4';

  // Only show badge if it exists (past events or canceled)
  if (!statusBadge) {
    return (
      <EventCard
        event={event as EventCardData}
        description={event.description}
        className={cardClassName}
      />
    );
  }

  return (
    <div>
      <EventCard
        event={event as EventCardData}
        description={event.description}
        rightSlot={<div
          className="hidden sm:block"
        >
          {statusBadge}
        </div>}
        className={cardClassName}
      />
      {/* Mobile: Show status badge below card */}
      <div
        className="mt-2 sm:hidden"
      >
        {statusBadge}
      </div>
    </div>
  );
}
