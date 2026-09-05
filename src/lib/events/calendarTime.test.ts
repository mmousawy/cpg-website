import { describe, expect, it } from 'vitest';

import { getCalendarDateTimes } from './calendarTime';

describe('getCalendarDateTimes', () => {
  it('formats a CEST event as floating local time plus Outlook offset', () => {
    expect(getCalendarDateTimes('2026-04-26', '13:00:00')).toEqual({
      startDate: '20260426T130000',
      endDate: '20260426T160000',
      outlookStartDate: '2026-04-26T13:00:00+02:00',
      outlookEndDate: '2026-04-26T16:00:00+02:00',
    });
  });

  it('formats a CET event with the winter offset', () => {
    expect(getCalendarDateTimes('2026-01-15', '13:00:00')).toEqual({
      startDate: '20260115T130000',
      endDate: '20260115T160000',
      outlookStartDate: '2026-01-15T13:00:00+01:00',
      outlookEndDate: '2026-01-15T16:00:00+01:00',
    });
  });

  it('rolls the end date when the duration crosses midnight', () => {
    expect(getCalendarDateTimes('2026-04-26', '22:30:00')).toEqual({
      startDate: '20260426T223000',
      endDate: '20260427T013000',
      outlookStartDate: '2026-04-26T22:30:00+02:00',
      outlookEndDate: '2026-04-27T01:30:00+02:00',
    });
  });
});
