import { getMemberStatsDetail, getMemberTimeSeries } from '@/lib/data/memberStats';
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
      const points = await fetchTimeSeries(supabase, metric, { start, end, bucket: zoomBucket }, user.id);
      return NextResponse.json({ series: [{ metric, points }] });
    }

    const range = parseRange(params.get('range'));

    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname, created_at')
      .eq('id', user.id)
      .single();

    const nickname = profile?.nickname ?? user.id;
    const allTimeStart = new Date(user.created_at ?? profile?.created_at ?? Date.now());

    const { data: lifetime, error: statsError } = await supabase.rpc('get_user_stats', {
      p_user_id: user.id,
    });

    if (statsError) {
      console.error('get_user_stats:', statsError);
      return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
    }

    const detail = await getMemberStatsDetail(user.id, nickname);
    const { bucket, series } = await getMemberTimeSeries(user.id, range, allTimeStart);

    return NextResponse.json({
      lifetime,
      detail,
      range,
      bucket,
      series,
      nickname,
    });
  } catch (error) {
    console.error('account stats analytics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
