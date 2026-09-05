import { describe, expect, it } from 'vitest';

import { formatFileSize } from '@/utils/formatFileSize';
import { allTimeBucket, buildEmptyBuckets, bucketForSpanMs, fillStorageTimeSeries, fillTimeSeries, getRangeConfig, isFinerBucket, parseStorageRpcData } from '@/utils/stats/timeSeries';

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    expect(formatFileSize(null)).toBeNull();
  });
});

describe('timeSeries', () => {
  it('returns day buckets for last week', () => {
    const { bucket } = getRangeConfig('7d');
    expect(bucket).toBe('day');
    expect(buildEmptyBuckets('7d').length).toBe(7);
  });

  it('returns day buckets for 30d', () => {
    const { bucket } = getRangeConfig('30d');
    expect(bucket).toBe('day');
    expect(buildEmptyBuckets('30d').length).toBe(30);
  });

  it('uses day buckets when all time spans a few months', () => {
    const created = new Date();
    created.setUTCDate(created.getUTCDate() - 40);
    created.setUTCHours(15, 30, 0, 0);
    const dayKey = created.toISOString().slice(0, 10);
    const { start, bucket } = getRangeConfig('all', { allTimeStart: created });
    expect(bucket).toBe('day');
    expect(start.toISOString().slice(0, 10)).toBe(dayKey);
    const keys = buildEmptyBuckets('all', { allTimeStart: created });
    expect(keys[0]).toBe(dayKey);
    expect(keys.includes('2020-01-01')).toBe(false);

    const mid = keys[Math.floor(keys.length / 2)];
    const filled = fillTimeSeries('all', [{ date: mid, value: 3 }], { allTimeStart: created });
    expect(filled[0]?.date).toBe(dayKey);
    expect(filled[0]?.value).toBe(0);
    expect(filled.find((p) => p.date === mid)?.value).toBe(3);
  });

  it('uses week buckets when all time spans years', () => {
    const created = new Date();
    created.setUTCFullYear(created.getUTCFullYear() - 3);
    created.setUTCHours(12, 0, 0, 0);
    const { start, bucket } = getRangeConfig('all', { allTimeStart: created });
    expect(bucket).toBe('week');
    expect(start.getUTCDay()).toBe(1);
    const keys = buildEmptyBuckets('all', { allTimeStart: created });
    expect(keys[0]).toBe(start.toISOString().slice(0, 10));
    expect(keys.length).toBeGreaterThan(100);
  });

  it('returns weekly UTC bucket keys for all time', () => {
    const { bucket } = getRangeConfig('all');
    expect(bucket).toBe('week');
    const keys = buildEmptyBuckets('all');
    expect(keys[0]).toBe('2019-12-30');
    expect(keys.includes('2024-06-03')).toBe(true);
  });

  it('starts all-time charts at the first non-zero week', () => {
    const filled = fillTimeSeries('all', [
      { date: '2024-06-03', value: 100 },
      { date: '2025-01-06', value: 50 },
    ]);
    expect(filled[0]?.date).toBe('2024-06-03');
    expect(filled.find((p) => p.date === '2019-12-30')).toBeUndefined();
    expect(filled.find((p) => p.date === '2024-06-03')?.value).toBe(100);
    expect(filled.find((p) => p.date === '2025-01-06')?.value).toBe(50);
  });

  it('starts all-time storage at the first week with data', () => {
    const filled = fillStorageTimeSeries('all', [
      { date: '2024-06-03', value: 1000 },
      { date: '2024-06-10', value: 2500 },
    ]);
    expect(filled[0]?.date).toBe('2024-06-03');
    expect(filled[0]?.value).toBe(1000);
    expect(filled.find((p) => p.date === '2019-12-30')).toBeUndefined();
  });

  it('starts from baseline when bucket points are missing', () => {
    const keys = buildEmptyBuckets('7d');
    const filled = fillStorageTimeSeries('7d', [], 382100000);
    expect(filled[0].value).toBe(382100000);
    expect(filled[6].value).toBe(382100000);
  });

  it('forward-fills absolute storage levels across buckets', () => {
    const keys = buildEmptyBuckets('7d');
    const filled = fillStorageTimeSeries('7d', [
      { date: keys[0], value: 1000 },
      { date: keys[3], value: 382100000 },
    ]);
    expect(filled[0].value).toBe(1000);
    expect(filled[1].value).toBe(1000);
    expect(filled[2].value).toBe(1000);
    expect(filled[3].value).toBe(382100000);
    expect(filled[4].value).toBe(382100000);
    expect(filled[6].value).toBe(382100000);
  });

  it('parses storage RPC arrays and object payloads', () => {
    expect(parseStorageRpcData([{ date: '2026-09-01', value: '100' }])).toEqual({
      baseline: 0,
      points: [{ date: '2026-09-01', value: 100 }],
    });
    expect(
      parseStorageRpcData({ baseline: '50', points: [{ date: '2026-09-01', value: 80 }] }),
    ).toEqual({
      baseline: 50,
      points: [{ date: '2026-09-01', value: 80 }],
    });
  });

  it('fills missing points with zero', () => {
    const filled = fillTimeSeries('30d', [{ date: buildEmptyBuckets('30d')[0], value: 5 }]);
    expect(filled[0].value).toBe(5);
    expect(filled[1].value).toBe(0);
  });

  it('picks a finer bucket as the zoomed span shrinks', () => {
    expect(bucketForSpanMs(3 * 24 * 60 * 60 * 1000)).toBe('hour');
    expect(bucketForSpanMs(30 * 24 * 60 * 60 * 1000)).toBe('day');
    expect(bucketForSpanMs(180 * 24 * 60 * 60 * 1000)).toBe('week');
    expect(bucketForSpanMs(800 * 24 * 60 * 60 * 1000)).toBe('month');
    expect(isFinerBucket('day', 'month')).toBe(true);
    expect(isFinerBucket('day', 'day')).toBe(false);
    expect(allTimeBucket(800 * 24 * 60 * 60 * 1000)).toBe('week');
  });
});
