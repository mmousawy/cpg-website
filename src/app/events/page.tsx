import PageContainer from '@/components/layout/PageContainer';
import EventsList from '@/components/events/EventsList';
import PastEventsPaginated from '@/components/events/PastEventsPaginated';

// Cached data functions
import { getUpcomingEvents, getPastEvents, getEventAttendees } from '@/lib/data/events';

const PAST_EVENTS_PER_PAGE = 5;

export default async function EventsPage() {
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="mt-2 text-foreground/70">
          Join us at our upcoming meetups or browse past events
        </p>
      </div>

      <div className="space-y-10">
        {/* Upcoming Events */}
        <section>
          <h2 className="text-lg font-semibold mb-4 opacity-70">Upcoming</h2>
          <div className="grid gap-4 sm:gap-6">
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
          <h2 className="text-lg font-semibold mb-4 opacity-70">Past events</h2>
          <div className="grid gap-4 sm:gap-6">
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
