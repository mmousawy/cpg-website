import type { CPGEvent, EventAttendee } from '@/types/events';
import { cacheLife, cacheTag } from 'next/cache';

import { getEventAttendees, getPastEvents, getUpcomingEvents } from './events';

const PAST_EVENTS_PER_PAGE = 5;

export type EventsPageData = {
  upcomingEvents: CPGEvent[];
  initialPast: CPGEvent[];
  pastEventsCount: number;
  serverNow: number;
  attendeesByEvent: Record<number, EventAttendee[]>;
};

export async function getEventsPageData(): Promise<EventsPageData> {
  'use cache';
  cacheLife('eventsPage');
  cacheTag('events-page');

  const [upcomingData, pastEventsData] = await Promise.all([
    getUpcomingEvents(),
    getPastEvents(PAST_EVENTS_PER_PAGE),
  ]);

  const { events: upcomingEvents, serverNow } = upcomingData;
  const { events: initialPast, totalCount: pastEventsCount } = pastEventsData;

  const displayedEventIds = [
    ...upcomingEvents.map((event) => event.id),
    ...initialPast.map((event) => event.id),
  ];

  const attendeesByEvent = displayedEventIds.length > 0
    ? await getEventAttendees(displayedEventIds)
    : ({} as Record<number, EventAttendee[]>);

  return {
    upcomingEvents,
    initialPast,
    pastEventsCount,
    serverNow,
    attendeesByEvent,
  };
}
