import type { SceneEvent } from '@/types/scene';
import { getAmsterdamDateString } from '@/lib/events/status';

type SceneDateFields = Pick<SceneEvent, 'start_date' | 'end_date'>;

function isSceneEventUpcoming(event: SceneDateFields, nowDate: string): boolean {
  if (event.end_date && event.end_date >= nowDate) return true;
  return event.start_date >= nowDate;
}

function isSceneEventPast(event: SceneDateFields, nowDate: string): boolean {
  if (event.end_date) {
    return event.end_date < nowDate;
  }
  return event.start_date < nowDate;
}

/** Upcoming scene events, soonest first. */
export function filterUpcomingSceneEvents<T extends SceneEvent>(
  events: T[],
  serverNow = Date.now(),
): T[] {
  const nowDate = getAmsterdamDateString(serverNow);
  return events
    .filter((e) => isSceneEventUpcoming(e, nowDate))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

/** Past scene events, newest first. */
export function filterPastSceneEvents<T extends SceneEvent>(
  events: T[],
  serverNow = Date.now(),
): T[] {
  const nowDate = getAmsterdamDateString(serverNow);
  return events
    .filter((e) => isSceneEventPast(e, nowDate))
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
}

/** Related upcoming scene events in the same city or category. */
export function filterRelatedSceneEvents<T extends SceneEvent & { id: string; location_city: string; category: string }>(
  events: T[],
  excludeId: string,
  city: string,
  category: string,
  limit: number,
  serverNow = Date.now(),
): T[] {
  const nowDate = getAmsterdamDateString(serverNow);
  return events
    .filter(
      (e) =>
        e.id !== excludeId
        && e.start_date >= nowDate
        && (e.location_city === city || e.category === category),
    )
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, limit);
}
