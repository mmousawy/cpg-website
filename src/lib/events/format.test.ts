import { describe, expect, it } from 'vitest';

import { formatEventDate, formatEventPageTitle, formatEventTime, getDateSortValue } from './format';

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

describe('formatEventPageTitle', () => {
  it('includes date and time for a titled event in the current year', () => {
    expect(formatEventPageTitle({
      title: 'Sunset photo walk',
      date: '2026-04-26',
      time: '13:00:00',
      now,
    })).toBe('Sunset photo walk — Sun, 26 Apr at 13:00');
  });

  it('includes the year when the event is in a different year', () => {
    expect(formatEventPageTitle({
      title: 'Sunset photo walk',
      date: '2025-01-25',
      time: '09:15',
      now,
    })).toBe('Sunset photo walk — Sat, 25 Jan 2025 at 09:15');
  });

  it('omits time when it is missing', () => {
    expect(formatEventPageTitle({
      title: 'Sunset photo walk',
      date: '2026-04-26',
      now,
    })).toBe('Sunset photo walk — Sun, 26 Apr');
  });

  it('falls back to the event name when date is missing', () => {
    expect(formatEventPageTitle({
      title: 'Sunset photo walk',
      time: '13:00',
    })).toBe('Sunset photo walk');
  });

  it('falls back to Event when the title is empty', () => {
    expect(formatEventPageTitle({
      title: '  ',
      date: '2026-04-26',
      time: '13:00',
      now,
    })).toBe('Event — Sun, 26 Apr at 13:00');
  });
});
