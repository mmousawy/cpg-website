import { describe, expect, it } from 'vitest';

import { formatEventDate, formatEventTime, getDateSortValue } from './format';

const now = Date.parse('2026-04-26T12:00:00Z');

describe('event format helpers', () => {
  it('formats short event dates without the year when the event is in the current year', () => {
    expect(formatEventDate('2026-04-26', { includeYear: true, now })).toBe('Sun, 26 Apr');
  });

  it('formats short event dates with the year when the event is in a different year', () => {
    expect(formatEventDate('2025-01-25', { includeYear: true, now })).toBe('Sat, 25 Jan 2025');
  });

  it('formats long event dates for the detail page style', () => {
    expect(formatEventDate('2026-04-26', { includeYear: true, style: 'long', now })).toBe('Sunday, 26 April');
  });

  it('always includes the year when includeYear is set and now is omitted', () => {
    expect(formatEventDate('2026-04-26', { includeYear: true })).toBe('Sun, 26 Apr 2026');
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
