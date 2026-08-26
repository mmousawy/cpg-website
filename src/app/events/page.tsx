import { cacheLife, cacheTag } from 'next/cache';
import EventsList from '@/components/events/EventsList';
import PastEventsPaginated from '@/components/events/PastEventsPaginated';
import PageContainer from '@/components/layout/PageContainer';
import HelpLink from '@/components/shared/HelpLink';
import { getEventsPageData } from '@/lib/data/eventsPage';
import { createMetadata } from '@/utils/metadata';

const PAST_EVENTS_PER_PAGE = 5;

export const metadata = createMetadata({
  title: 'Upcoming meetups & photo walks',
  description: 'Browse upcoming and past photography meetups and photo walks. Join us for monthly events in the Netherlands.',
  canonical: '/events',
  keywords: ['photography events', 'meetups', 'photo walks', 'Netherlands', 'photography meetups'],
});

export default async function EventsPage() {
  'use cache';
  cacheLife('eventsPage');
  cacheTag('events-page');

  const {
    upcomingEvents,
    initialPast,
    pastEventsCount,
    serverNow,
    attendeesByEvent,
  } = await getEventsPageData();

  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <div
          className="flex items-center gap-2 mb-1"
        >
          <h1
            className="text-2xl sm:text-3xl font-bold font-heading"
          >
            Events
          </h1>
          <HelpLink
            href="join-events"
            label="How to find and join events"
            size="lg"
          />
        </div>
        <p
          className="text-base sm:text-lg opacity-80"
        >
          Join our upcoming meetups or explore past events
        </p>
      </div>

      <div
        className="space-y-6 sm:space-y-10"
      >
        <section>
          <h2
            className="text-xl font-semibold mb-4 opacity-80 font-heading"
          >
            Upcoming events &mdash; {upcomingEvents.length}
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

        <section>
          <h2
            className="text-xl font-semibold mb-4 opacity-80 font-heading"
          >
            Past events &mdash; {pastEventsCount}
          </h2>
          <div
            className="grid gap-4 sm:gap-6"
          >
            <PastEventsPaginated
              initialEvents={initialPast}
              initialAttendees={attendeesByEvent}
              totalCount={pastEventsCount}
              perPage={PAST_EVENTS_PER_PAGE}
              serverNow={serverNow}
            />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
