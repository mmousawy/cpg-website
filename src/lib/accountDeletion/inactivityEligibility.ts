/**
 * Amsterdam calendar-day comparison for inactivity (6 months never returned, 2 years stale login).
 */

const AMS = 'Europe/Amsterdam';

export function calendarDateStringInTimeZone(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !day) {
    throw new Error('Failed to format calendar date');
  }
  return `${y}-${m}-${day}`;
}

/** Parse calendar-only date string as UTC midnight (comparison via calendar strings only). */
export function parseCalendarDateOnly(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return new Date(NaN);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function addCalendarMonths(calendarYmd: string, months: number): string {
  const d = parseCalendarDateOnly(calendarYmd);
  if (Number.isNaN(d.getTime())) return calendarYmd;
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(y, mo + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDay);
  target.setUTCDate(clampedDay);
  const yy = target.getUTCFullYear();
  const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(target.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function addCalendarYears(calendarYmd: string, years: number): string {
  return addCalendarMonths(calendarYmd, years * 12);
}

function compareCalendarYmd(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export type InactivityEligibilityInput = {
  now: Date;
  createdAt: string | null;
  lastLoggedIn: string | null;
};

/**
 * Never returned: last login is null or same Amsterdam calendar day as created_at.
 * Otherwise use last_logged_in Amsterdam calendar day vs created + 6 months / last login + 2 years.
 */
export function isEligibleForInactivityDeletion(input: InactivityEligibilityInput): boolean {
  const { now, createdAt, lastLoggedIn } = input;
  if (!createdAt) return false;

  const todayAms = calendarDateStringInTimeZone(now, AMS);
  const createdYmd = calendarDateStringInTimeZone(new Date(createdAt), AMS);

  const neverReturned =
    lastLoggedIn == null
    || calendarDateStringInTimeZone(new Date(lastLoggedIn), AMS) === createdYmd;

  if (neverReturned) {
    const threshold = addCalendarMonths(createdYmd, 6);
    return compareCalendarYmd(todayAms, threshold) >= 0;
  }

  const lastYmd = calendarDateStringInTimeZone(new Date(lastLoggedIn), AMS);
  const threshold = addCalendarYears(lastYmd, 2);
  return compareCalendarYmd(todayAms, threshold) >= 0;
}
