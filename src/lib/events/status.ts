export const EVENT_END_HOUR = 17;
export const EVENT_TIMEZONE = 'Europe/Amsterdam';

export type EventStatus = 'past' | 'now' | 'upcoming';

const amsterdamClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: EVENT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function getAmsterdamWallClock(nowTs = Date.now()) {
  const parts = amsterdamClock.formatToParts(new Date(nowTs));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const hour = Number(value('hour'));
  const minute = Number(value('minute'));

  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    minutes: hour * 60 + minute,
  };
}

export function getAmsterdamDateString(nowTs = Date.now()) {
  return getAmsterdamWallClock(nowTs).date;
}

function getAmsterdamMinutes(nowTs = Date.now()) {
  return getAmsterdamWallClock(nowTs).minutes;
}

function eventStartMinutes(time: string) {
  const normalized = time.length === 5 ? `${time}:00` : time;
  const [hours, minutes] = normalized.split(':').map(Number);

  return hours * 60 + (minutes || 0);
}

export function getEventQueryContext(nowTs = Date.now()) {
  const { date, minutes } = getAmsterdamWallClock(nowTs);

  return {
    nowDate: date,
    hasEventDayEnded: minutes >= EVENT_END_HOUR * 60,
  };
}

/**
 * Get event status (past / now / upcoming) using Europe/Amsterdam timezone.
 * "Now" = event day, between start time and 17:00. After 17:00 on event day = past.
 */
export function getEventStatus(
  date: string | null,
  time: string | null,
  now = Date.now(),
): EventStatus {
  if (!date) return 'upcoming';

  const { nowDate, hasEventDayEnded } = getEventQueryContext(now);

  if (date < nowDate) return 'past';

  if (date === nowDate) {
    if (hasEventDayEnded) return 'past';

    if (time && getAmsterdamMinutes(now) >= eventStartMinutes(time)) {
      return 'now';
    }
  }

  return 'upcoming';
}

export function isEventPast(date: string | null, now?: number, time?: string | null): boolean {
  return getEventStatus(date, time ?? null, now) === 'past';
}
