import { describe, expect, it, vi } from 'vitest';

import { formatEventDate, formatEventTime, getDateSortValue } from './format';

describe('event format helpers', () => {
  it('formats short event dates without the year when the event is in the current year', () => {
    vi.setSystemTime(new Date('2026-04-26T12:00:00Z'));

    expect(formatEventDate('2026-04-26', { includeYear: true })).toBe('Sun, 26 Apr');
  });

  it('formats short event dates with the year when the event is in a different year', () => {
    vi.setSystemTime(new Date('2026-04-26T12:00:00Z'));

    expect(formatEventDate('2025-01-25', { includeYear: true })).toBe('Sat, 25 Jan 2025');
  });

  it('formats long event dates for the detail page style', () => {
    vi.setSystemTime(new Date('2026-04-26T12:00:00Z'));

    expect(formatEventDate('2026-04-26', { includeYear: true, style: 'long' })).toBe('Sunday, 26 April');
  });

  it('formats event times as HH:mm', () => {
    expect(formatEventTime('13:00:00')).toBe('13:00');
    expect(formatEventTime('09:15')).toBe('09:15');
  });

  it('returns sortable timestamps for event dates', () => {
    expect(getDateSortValue('2026-04-26')).toBeLessThan(getDateSortValue('2026-04-27'));
    expect(getDateSortValue(null)).toBe(0);
  });
});
