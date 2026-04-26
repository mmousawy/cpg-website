import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import {
  getAmsterdamDateString,
  getEventQueryContext,
  getEventStatus,
  isEventPast,
} from './status';

describe('event status helpers', () => {
  it('uses Amsterdam local date instead of UTC date boundaries', () => {
    const now = dayjs.utc('2026-04-25T22:30:00Z').valueOf();

    expect(getAmsterdamDateString(now)).toBe('2026-04-26');
  });

  it('keeps same-day events upcoming before they start', () => {
    const now = dayjs.utc('2026-04-26T10:00:00Z').valueOf(); // 12:00 in Amsterdam

    expect(getEventStatus('2026-04-26', '13:00:00', now)).toBe('upcoming');
  });

  it('marks same-day events as happening now after the start time', () => {
    const now = dayjs.utc('2026-04-26T11:30:00Z').valueOf(); // 13:30 in Amsterdam

    expect(getEventStatus('2026-04-26', '13:00:00', now)).toBe('now');
  });

  it('marks same-day events as past after the 17:00 Amsterdam cutoff', () => {
    const now = dayjs.utc('2026-04-26T15:01:00Z').valueOf(); // 17:01 in Amsterdam

    expect(getEventStatus('2026-04-26', '13:00:00', now)).toBe('past');
    expect(isEventPast('2026-04-26', now, '13:00:00')).toBe(true);
  });

  it('returns the expected query context around the event-day cutoff', () => {
    const beforeCutoff = dayjs.utc('2026-04-26T14:30:00Z').valueOf(); // 16:30 in Amsterdam
    const afterCutoff = dayjs.utc('2026-04-26T15:30:00Z').valueOf(); // 17:30 in Amsterdam

    expect(getEventQueryContext(beforeCutoff)).toEqual({
      nowDate: '2026-04-26',
      hasEventDayEnded: false,
    });
    expect(getEventQueryContext(afterCutoff)).toEqual({
      nowDate: '2026-04-26',
      hasEventDayEnded: true,
    });
  });
});
