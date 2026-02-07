import { cacheLife, cacheTag } from 'next/cache';

import EventsList from '@/components/events/EventsList';
import PastEventsPaginated from '@/components/events/PastEventsPaginated';
import PageContainer from '@/components/layout/PageContainer';
import { createMetadata } from '@/utils/metadata';

// Cached data functions
import { getEventAttendees, getPastEvents, getUpcomingEvents } from '@/lib/data/events';

const PAST_EVENTS_PER_PAGE = 5;

export const metadata = createMetadata({
  title: 'Events & Meetups',
  description: 'Browse upcoming and past photography meetups and photo walks. Join us for monthly events in the Netherlands.',
  canonical: '/events',
  keywords: ['photography events', 'meetups', 'photo walks', 'Netherlands', 'photography meetups'],
});

export default async function EventsPage() {
  'use cache';
  cacheLife('max');
  cacheTag('events');
  cacheTag('event-attendees');

  // Fetch events using cached data functions
  const [upcomingData, pastEventsData] = await Promise.all([
    getUpcomingEvents(),
    getPastEvents(PAST_EVENTS_PER_PAGE),
  ]);

  const { events: upcomingEvents, serverNow } = upcomingData;
  const { events: initialPast, totalCount: pastEventsCount } = pastEventsData;

  // Fetch attendees for all displayed events
  const displayedEventIds = [
    ...upcomingEvents.map(e => e.id),
    ...initialPast.map(e => e.id),
  ];

  const attendeesByEvent = await getEventAttendees(displayedEventIds);

  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <h1
          className="text-2xl sm:text-3xl font-bold"
        >
          Events
        </h1>
        <p
          className="text-base sm:text-lg mt-2 text-foreground/70"
        >
          Join us at our upcoming meetups or browse past events
        </p>
      </div>

      <div
        className="space-y-10"
      >
        {/* Upcoming Events */}
        <section>
          <h2
            className="text-lg font-semibold mb-4 opacity-70"
          >
            Upcoming
          </h2>
          <div
            className="grid gap-4 sm:gap-6"
          >
            <EventsList
              events={upcomingEvents}
              attendeesByEvent={attendeesByEvent}
              emptyMessage="No upcoming events scheduled. Check back soon!"
              serverNow={serverNow}
            />
          </div>
        </section>

        {/* Past Events - Paginated */}
        <section>
          <h2
            className="text-lg font-semibold mb-4 opacity-70"
          >
            Past events
          </h2>
          <div
            className="grid gap-4 sm:gap-6"
          >
            <PastEventsPaginated
              initialEvents={initialPast}
              initialAttendees={attendeesByEvent}
              totalCount={pastEventsCount}
              perPage={PAST_EVENTS_PER_PAGE}
            />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
