import { EVENT_TIMEZONE } from '@/lib/events/status';

const amsterdamDateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: EVENT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function normalizeEventTime(time: string | null | undefined) {
  if (!time) return '00:00:00';
  if (time.length === 5) return `${time}:00`;

  return time;
}

function getTimeZoneOffsetIso(utcMs: number) {
  const tzName = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIMEZONE,
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date(utcMs))
    .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';

  const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return '+00:00';

  return `${match[1]}${match[2].padStart(2, '0')}:${(match[3] ?? '00').padStart(2, '0')}`;
}

function getTimeZoneOffsetMs(utcMs: number) {
  const iso = getTimeZoneOffsetIso(utcMs);
  const sign = iso.startsWith('-') ? -1 : 1;
  const [hours, minutes] = iso.slice(1).split(':').map(Number);

  return sign * (hours * 60 + minutes) * 60_000;
}

function amsterdamLocalToUtcMs(date: string, time: string) {
  const asUtc = Date.parse(`${date}T${normalizeEventTime(time)}Z`);
  if (Number.isNaN(asUtc)) return Date.parse('1970-01-01T00:00:00Z');

  const firstPass = asUtc - getTimeZoneOffsetMs(asUtc);

  return asUtc - getTimeZoneOffsetMs(firstPass);
}

function amsterdamParts(utcMs: number) {
  const parts = amsterdamDateTime.formatToParts(new Date(utcMs));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

function compactDateTime(parts: ReturnType<typeof amsterdamParts>) {
  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
}

function outlookDateTime(parts: ReturnType<typeof amsterdamParts>, utcMs: number) {
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${getTimeZoneOffsetIso(utcMs)}`;
}

/**
 * Calendar start/end stamps for an event in Europe/Amsterdam.
 * Google/Apple use floating local datetimes; Outlook includes the offset.
 */
export function getCalendarDateTimes(
  date: string | null | undefined,
  time: string | null | undefined,
  durationHours = 3,
) {
  const startMs = amsterdamLocalToUtcMs(date || '1970-01-01', normalizeEventTime(time));
  const endMs = startMs + durationHours * 60 * 60 * 1000;
  const start = amsterdamParts(startMs);
  const end = amsterdamParts(endMs);

  return {
    startDate: compactDateTime(start),
    endDate: compactDateTime(end),
    outlookStartDate: outlookDateTime(start, startMs),
    outlookEndDate: outlookDateTime(end, endMs),
  };
}
