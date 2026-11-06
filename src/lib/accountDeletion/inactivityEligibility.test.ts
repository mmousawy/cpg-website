import { describe, expect, it } from 'vitest';

import {
  addCalendarMonths,
  calendarDateStringInTimeZone,
  isEligibleForInactivityDeletion,
} from './inactivityEligibility';

describe('isEligibleForInactivityDeletion', () => {
  it('never returned: eligible once created_at is 6+ calendar months ago (Amsterdam)', () => {
    const createdAt = '2024-01-15T12:00:00.000Z';
    const createdYmd = calendarDateStringInTimeZone(new Date(createdAt), 'Europe/Amsterdam');
    const sixMonthsLater = addCalendarMonths(createdYmd, 6);
    const [y, m, d] = sixMonthsLater.split('-').map(Number);
    const now = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    expect(
      isEligibleForInactivityDeletion({
        now,
        createdAt,
        lastLoggedIn: null,
      }),
    ).toBe(true);
  });

  it('never returned: not eligible before 6 calendar months', () => {
    const createdAt = '2024-01-15T12:00:00.000Z';
    const createdYmd = calendarDateStringInTimeZone(new Date(createdAt), 'Europe/Amsterdam');
    const almostSix = addCalendarMonths(createdYmd, 6);
    const [y, m, d] = almostSix.split('-').map(Number);
    const dayBefore = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
    expect(
      isEligibleForInactivityDeletion({
        now: dayBefore,
        createdAt,
        lastLoggedIn: null,
      }),
    ).toBe(false);
  });

  it('returned later: eligible when last login Amsterdam day is 2+ calendar years before today', () => {
    const createdAt = '2020-01-10T12:00:00.000Z';
    const lastLoggedIn = '2022-06-01T10:00:00.000Z';
    const lastYmd = calendarDateStringInTimeZone(new Date(lastLoggedIn), 'Europe/Amsterdam');
    const twoYearsAfter = addCalendarMonths(lastYmd, 24);
    const [y, m, d] = twoYearsAfter.split('-').map(Number);
    const now = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    expect(
      isEligibleForInactivityDeletion({
        now,
        createdAt,
        lastLoggedIn,
      }),
    ).toBe(true);
  });

  it('same calendar day as signup counts as never returned', () => {
    const createdAt = '2023-01-01T08:00:00.000Z';
    const lastSameDay = '2023-01-01T22:00:00.000Z';
    const createdYmd = calendarDateStringInTimeZone(new Date(createdAt), 'Europe/Amsterdam');
    const threshold = addCalendarMonths(createdYmd, 6);
    const [y, m, d] = threshold.split('-').map(Number);
    const now = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    expect(
      isEligibleForInactivityDeletion({
        now,
        createdAt,
        lastLoggedIn: lastSameDay,
      }),
    ).toBe(true);
  });
});
