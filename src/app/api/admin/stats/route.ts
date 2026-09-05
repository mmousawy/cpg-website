import { checkIsAdmin } from '@/lib/auth/checkIsAdmin';
import { getAdminStatsOverview, getAdminTimeSeries } from '@/lib/data/adminStats';
import { fetchTimeSeries } from '@/lib/data/statsTimeSeries';
import type { StatsRange } from '@/types/stats';
import type { StatsBucket } from '@/utils/stats/timeSeries';
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

function parseRange(value: string | null): StatsRange {
  if (value === '7d' || value === '90d' || value === 'all') return value;
  if (value === '12m') return 'all';
  return '30d';
}

function parseBucket(value: string | null): StatsBucket | null {
  if (value === 'hour' || value === 'day' || value === 'week' || value === 'month') return value;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await checkIsAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const metric = params.get('metric');
    const from = params.get('from');
    const to = params.get('to');
    const zoomBucket = parseBucket(params.get('bucket'));

    if (metric && from && to && zoomBucket) {
      const start = new Date(from);
      const end = new Date(to);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
      }
      const points = await fetchTimeSeries(supabase, metric, { start, end, bucket: zoomBucket });
      return NextResponse.json({ series: [{ metric, points }] });
    }

    const range = parseRange(params.get('range'));
    const includeSeries = params.get('series') === '1';

    const overview = await getAdminStatsOverview();
    if (!overview) {
      return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
    }

    if (!includeSeries) {
      return NextResponse.json({ overview });
    }

    const { bucket, series } = await getAdminTimeSeries(range);
    return NextResponse.json({ overview, range, bucket, series });
  } catch (error) {
    console.error('admin stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
