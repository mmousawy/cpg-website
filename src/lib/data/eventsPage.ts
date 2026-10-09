import type { CPGEvent, EventAttendee } from '@/types/events';

import { getEventAttendees, getEventPhotoCounts, getPastEvents, getUpcomingEvents } from './events';

const PAST_EVENTS_PER_PAGE = 5;

export type EventsPageData = {
  upcomingEvents: CPGEvent[];
  initialPast: CPGEvent[];
  pastEventsCount: number;
  serverNow: number;
  attendeesByEvent: Record<number, EventAttendee[]>;
  photoCountsByEvent: Record<number, number>;
};

export async function getEventsPageData(): Promise<EventsPageData> {
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

  const [attendeesByEvent, photoCountsByEvent] = displayedEventIds.length > 0
    ? await Promise.all([
      getEventAttendees(displayedEventIds),
      getEventPhotoCounts(displayedEventIds),
    ])
    : [{} as Record<number, EventAttendee[]>, {} as Record<number, number>];

  return {
    upcomingEvents,
    initialPast,
    pastEventsCount,
    serverNow,
    attendeesByEvent,
    photoCountsByEvent,
  };
}
