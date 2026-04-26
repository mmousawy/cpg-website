import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export const EVENT_END_HOUR = 17;
export const EVENT_TIMEZONE = 'Europe/Amsterdam';

export type EventStatus = 'past' | 'now' | 'upcoming';

function getAmsterdamNow(nowTs = Date.now()) {
  return dayjs(nowTs).tz(EVENT_TIMEZONE);
}

export function getAmsterdamDateString(nowTs = Date.now()) {
  return getAmsterdamNow(nowTs).format('YYYY-MM-DD');
}

function getAmsterdamMinutes(nowTs = Date.now()) {
  const now = getAmsterdamNow(nowTs);
  const hours = now.hour();
  const minutes = now.minute();

  return hours * 60 + minutes;
}

function normalizeEventTime(time: string | null) {
  if (!time) return '00:00:00';
  if (time.length === 5) return `${time}:00`;

  return time;
}

export function getEventQueryContext(nowTs = Date.now()) {
  const nowDate = getAmsterdamDateString(nowTs);

  return {
    nowDate,
    hasEventDayEnded: getAmsterdamMinutes(nowTs) >= EVENT_END_HOUR * 60,
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
  const nowInAmsterdam = getAmsterdamNow(now);

  if (date < nowDate) return 'past';

  if (date === nowDate) {
    if (hasEventDayEnded) return 'past';

    if (time) {
      const eventStart = dayjs.tz(
        `${date} ${normalizeEventTime(time)}`,
        'YYYY-MM-DD HH:mm:ss',
        EVENT_TIMEZONE,
      );

      if (!nowInAmsterdam.isBefore(eventStart)) return 'now';
    }
  }

  return 'upcoming';
}

export function isEventPast(date: string | null, now?: number, time?: string | null): boolean {
  return getEventStatus(date, time ?? null, now) === 'past';
}
