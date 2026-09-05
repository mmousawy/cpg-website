import type { StatsRange, StatsTimeSeriesPoint } from '@/types/stats';

export type StatsBucket = 'hour' | 'day' | 'week' | 'month';

const BUCKET_RANK: Record<StatsBucket, number> = {
  hour: 0,
  day: 1,
  week: 2,
  month: 3,
};

/** Earliest month for "all time" charts (UTC). */
export const STATS_ALL_TIME_START_YEAR = 2020;
export const STATS_ALL_TIME_START_MONTH = 0; // January

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Calendar date key in UTC (matches Postgres `date_trunc` in UTC). */
export function formatSeriesDateKey(date: Date, bucket: StatsBucket): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = date.getUTCHours();

  if (bucket === 'hour') {
    return `${y}-${pad2(m)}-${pad2(d)}T${pad2(h)}:00`;
  }

  if (bucket === 'month') {
    return `${y}-${pad2(m)}-01`;
  }

  if (bucket === 'week') {
    const dow = date.getUTCDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(date);
    monday.setUTCDate(d + mondayOffset);
    return `${monday.getUTCFullYear()}-${pad2(monday.getUTCMonth() + 1)}-${pad2(monday.getUTCDate())}`;
  }

  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function utcTodayEnd(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );
}

function utcDayStart(daysBeforeEnd: number, end: Date): Date {
  return new Date(
    Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate() - daysBeforeEnd,
      0,
      0,
      0,
      0,
    ),
  );
}

export type RangeConfigOptions = {
  /** When set, "all time" starts at this date (typically account created_at). */
  allTimeStart?: Date;
};

function utcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function alignToBucketStart(date: Date, bucket: StatsBucket): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const h = date.getUTCHours();

  if (bucket === 'hour') {
    return new Date(Date.UTC(y, m, d, h, 0, 0, 0));
  }
  if (bucket === 'day') {
    return new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  }
  if (bucket === 'week') {
    const dow = date.getUTCDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    return new Date(Date.UTC(y, m, d + mondayOffset, 0, 0, 0, 0));
  }
  return utcMonthStart(date);
}

/** All-time charts use the zoom ladder, but never coarser than a week. */
export function allTimeBucket(spanMs: number): StatsBucket {
  const bucket = bucketForSpanMs(spanMs);
  return bucket === 'month' ? 'week' : bucket;
}

export function getRangeConfig(range: StatsRange, options?: RangeConfigOptions): {
  start: Date;
  end: Date;
  bucket: StatsBucket;
} {
  const end = utcTodayEnd();

  if (range === '7d') {
    return { start: utcDayStart(6, end), end, bucket: 'day' };
  }

  if (range === '30d') {
    return { start: utcDayStart(29, end), end, bucket: 'day' };
  }

  if (range === '90d') {
    return { start: utcDayStart(89, end), end, bucket: 'day' };
  }

  const allTimeStart = options?.allTimeStart;
  const rawStart = allTimeStart && !Number.isNaN(allTimeStart.getTime())
    ? allTimeStart
    : new Date(
      Date.UTC(STATS_ALL_TIME_START_YEAR, STATS_ALL_TIME_START_MONTH, 1, 0, 0, 0, 0),
    );
  const bucket = allTimeBucket(end.getTime() - rawStart.getTime());
  return { start: alignToBucketStart(rawStart, bucket), end, bucket };
}

export function parseSeriesDateKey(dateKey: string): Date {
  if (dateKey.includes('T')) {
    return new Date(`${dateKey}:00.000Z`);
  }
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/** Inclusive end of a bucket (for RPC `p_end`). */
export function bucketEndInclusive(dateKey: string, bucket: StatsBucket): Date {
  const start = parseSeriesDateKey(dateKey);
  if (bucket === 'hour') {
    return new Date(start.getTime() + 60 * 60 * 1000 - 1);
  }
  if (bucket === 'week') {
    return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  }
  if (bucket === 'month') {
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1) - 1);
  }
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function bucketForSpanMs(spanMs: number): StatsBucket {
  const days = spanMs / (24 * 60 * 60 * 1000);
  if (days <= 5) return 'hour';
  if (days <= 92) return 'day';
  if (days <= 548) return 'week';
  return 'month';
}

export function isFinerBucket(next: StatsBucket, current: StatsBucket): boolean {
  return BUCKET_RANK[next] < BUCKET_RANK[current];
}

export function buildEmptyBucketsForWindow(
  start: Date,
  end: Date,
  bucket: StatsBucket,
): string[] {
  const keys: string[] = [];
  const cursor = new Date(start.getTime());

  while (cursor <= end) {
    keys.push(formatSeriesDateKey(cursor, bucket));
    if (bucket === 'hour') {
      cursor.setUTCHours(cursor.getUTCHours() + 1);
    } else if (bucket === 'day') {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    } else if (bucket === 'week') {
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    } else {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
    }
  }

  return keys;
}

/** Build empty bucket keys for a range so charts show continuous axes. */
export function buildEmptyBuckets(range: StatsRange, options?: RangeConfigOptions): string[] {
  const { start, end, bucket } = getRangeConfig(range, options);
  return buildEmptyBucketsForWindow(start, end, bucket);
}

function normalizeRpcDate(date: string, bucket: StatsBucket): string {
  if (bucket === 'month') {
    return `${date.slice(0, 7)}-01`;
  }
  return date;
}

export function coerceTimeSeriesPoints(rows: unknown[]): StatsTimeSeriesPoint[] {
  const points: StatsTimeSeriesPoint[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const { date, value } = row as { date?: unknown; value?: unknown };
    if (typeof date !== 'string') continue;
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) continue;
    points.push({ date, value: numeric });
  }
  return points;
}

/** Accept a plain series array or `{ baseline, points }`. */
export function parseStorageRpcData(data: unknown): {
  points: StatsTimeSeriesPoint[];
  baseline: number;
} {
  let raw = data;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { points: [], baseline: 0 };
    }
  }

  if (Array.isArray(raw)) {
    return { points: coerceTimeSeriesPoints(raw), baseline: 0 };
  }

  if (raw && typeof raw === 'object') {
    const obj = raw as { baseline?: unknown; points?: unknown };
    const baseline = Number(obj.baseline ?? 0);
    return {
      baseline: Number.isFinite(baseline) ? baseline : 0,
      points: Array.isArray(obj.points) ? coerceTimeSeriesPoints(obj.points) : [],
    };
  }

  return { points: [], baseline: 0 };
}

/** Drop empty months before the first real value (all-time charts only). */
export function trimLeadingZeros(points: StatsTimeSeriesPoint[]): StatsTimeSeriesPoint[] {
  const first = points.findIndex((p) => p.value !== 0);
  if (first === -1) return [];
  if (first === 0) return points;
  return points.slice(first);
}

type FillWindow = {
  start: Date;
  end: Date;
  bucket: StatsBucket;
  trimLeading?: boolean;
};

export function fillStorageTimeSeriesWindow(
  window: FillWindow,
  points: StatsTimeSeriesPoint[],
  baseline = 0,
): StatsTimeSeriesPoint[] {
  const keys = buildEmptyBucketsForWindow(window.start, window.end, window.bucket);
  const map = new Map(
    points.map((p) => [normalizeRpcDate(p.date, window.bucket), Number(p.value)]),
  );
  let last = baseline;
  const filled = keys.map((date) => {
    const v = map.get(date);
    if (v !== undefined) last = v;
    return { date, value: last };
  });
  return window.trimLeading ? trimLeadingZeros(filled) : filled;
}

export function fillTimeSeriesWindow(
  window: FillWindow,
  points: StatsTimeSeriesPoint[],
): StatsTimeSeriesPoint[] {
  const keys = buildEmptyBucketsForWindow(window.start, window.end, window.bucket);
  const map = new Map(
    points.map((p) => [normalizeRpcDate(p.date, window.bucket), Number(p.value)]),
  );
  const filled = keys.map((date) => ({
    date,
    value: map.get(date) ?? 0,
  }));
  return window.trimLeading ? trimLeadingZeros(filled) : filled;
}

export function fillStorageTimeSeries(
  range: StatsRange,
  points: StatsTimeSeriesPoint[],
  baseline = 0,
  options?: RangeConfigOptions,
): StatsTimeSeriesPoint[] {
  const { start, end, bucket } = getRangeConfig(range, options);
  return fillStorageTimeSeriesWindow(
    { start, end, bucket, trimLeading: range === 'all' && !options?.allTimeStart },
    points,
    baseline,
  );
}

/** Merge RPC points into a full series with zeros for missing buckets. */
export function fillTimeSeries(
  range: StatsRange,
  points: StatsTimeSeriesPoint[],
  options?: RangeConfigOptions,
): StatsTimeSeriesPoint[] {
  const { start, end, bucket } = getRangeConfig(range, options);
  return fillTimeSeriesWindow(
    { start, end, bucket, trimLeading: range === 'all' && !options?.allTimeStart },
    points,
  );
}

export function formatChartDateLabel(dateKey: string, bucket: StatsBucket): string {
  const d = parseSeriesDateKey(dateKey);
  if (bucket === 'hour') {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      timeZone: 'UTC',
    });
  }
  if (bucket === 'month') {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  if (bucket === 'week') {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
