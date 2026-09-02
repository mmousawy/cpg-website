import type { StatsRange, StatsTimeSeriesPoint } from '@/types/stats';
import {
  coerceTimeSeriesPoints,
  fillStorageTimeSeriesWindow,
  fillTimeSeriesWindow,
  getRangeConfig,
  parseStorageRpcData,
  type StatsBucket,
} from '@/utils/stats/timeSeries';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';

type AppSupabase = SupabaseClient<Database>;

export type StatsSeriesWindow = {
  start: Date;
  end: Date;
  bucket: StatsBucket;
  trimLeading?: boolean;
};

function resolveWindow(rangeOrWindow: StatsRange | StatsSeriesWindow): StatsSeriesWindow {
  if (typeof rangeOrWindow === 'string') {
    const { start, end, bucket } = getRangeConfig(rangeOrWindow);
    return { start, end, bucket, trimLeading: rangeOrWindow === 'all' };
  }
  return rangeOrWindow;
}

export async function fetchTimeSeries(
  supabase: AppSupabase,
  metric: string,
  rangeOrWindow: StatsRange | StatsSeriesWindow,
  userId?: string,
): Promise<StatsTimeSeriesPoint[]> {
  const window = resolveWindow(rangeOrWindow);

  const { data, error } = await supabase.rpc('get_stats_time_series', {
    p_metric: metric,
    p_start: window.start.toISOString(),
    p_end: window.end.toISOString(),
    p_bucket: window.bucket,
    p_user_id: userId ?? undefined,
  });

  if (error) {
    console.error(`fetchTimeSeries ${metric}:`, error);
    return metric === 'storage_added'
      ? fillStorageTimeSeriesWindow(window, [], 0)
      : fillTimeSeriesWindow(window, []);
  }

  if (metric === 'storage_added') {
    const { points, baseline } = parseStorageRpcData(data);
    return fillStorageTimeSeriesWindow(window, points, baseline);
  }

  const points = coerceTimeSeriesPoints(Array.isArray(data) ? data : []);
  return fillTimeSeriesWindow(window, points);
}
