import type { CPGEvent } from '@/types/events';
import { getEventQueryContext, isEventPast } from '@/lib/events/status';

/** Upcoming CPG events (not yet past in Amsterdam timezone). */
export function filterUpcomingEvents(events: CPGEvent[], serverNow = Date.now()): CPGEvent[] {
  const { nowDate, hasEventDayEnded } = getEventQueryContext(serverNow);

  return events.filter((event) => {
    if (!event.date) return true;

    if (hasEventDayEnded) {
      return event.date > nowDate;
    }

    return event.date >= nowDate;
  });
}

/** Past CPG events, newest first. */
export function filterPastEvents(events: CPGEvent[], serverNow = Date.now()): CPGEvent[] {
  const past = events.filter((event) => isEventPast(event.date, serverNow, event.time));
  return [...past].sort((a, b) => {
    const aDate = a.date ?? '';
    const bDate = b.date ?? '';
    return bDate.localeCompare(aDate);
  });
}
