import { fetchTimeSeries } from '@/lib/data/statsTimeSeries';
import type { MemberStatsDetail, StatsBreakdownItem, StatsRange, StatsRankedItem } from '@/types/stats';
import { getRangeConfig } from '@/utils/stats/timeSeries';
import { createClient } from '@/utils/supabase/server';

export type { MemberStatsDetail };

function mapPhotoRow(
  row: {
    id: string;
    short_id: string;
    title: string | null;
    url: string;
    blurhash: string | null;
    value: number;
  },
  nickname: string,
): StatsRankedItem {
  return {
    id: row.id,
    title: row.title || 'Untitled',
    value: row.value,
    href: `/@${nickname}/photo/${row.short_id}`,
    imageUrl: row.url,
    blurhash: row.blurhash,
  };
}

export async function getMemberStatsDetail(userId: string, nickname: string): Promise<MemberStatsDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_member_stats_detail', { p_user_id: userId });

  if (error || !data) {
    console.error('getMemberStatsDetail:', error);
    return null;
  }

  const raw = data as Record<string, unknown>;

  return {
    topPhotosByViews: ((raw.topPhotosByViews as unknown[]) ?? []).map((r) =>
      mapPhotoRow(r as Parameters<typeof mapPhotoRow>[0], nickname),
    ),
    topPhotosByLikes: ((raw.topPhotosByLikes as unknown[]) ?? []).map((r) =>
      mapPhotoRow(r as Parameters<typeof mapPhotoRow>[0], nickname),
    ),
    largestPhotos: ((raw.largestPhotos as unknown[]) ?? []).map((r) =>
      mapPhotoRow(r as Parameters<typeof mapPhotoRow>[0], nickname),
    ),
    storageBytes: Number(raw.storageBytes ?? 0),
    publicPhotoCount: Number(raw.publicPhotoCount ?? 0),
    privatePhotoCount: Number(raw.privatePhotoCount ?? 0),
    followers: Number(raw.followers ?? 0),
    following: Number(raw.following ?? 0),
    sharedAlbumsJoined: Number(raw.sharedAlbumsJoined ?? 0),
    sceneEventsSubmitted: Number(raw.sceneEventsSubmitted ?? 0),
    sceneInterests: Number(raw.sceneInterests ?? 0),
    mimeTypes: (raw.mimeTypes as StatsBreakdownItem[]) ?? [],
    licenses: (raw.licenses as StatsBreakdownItem[]) ?? [],
    topTags: (raw.topTags as StatsBreakdownItem[]) ?? [],
  };
}

export async function getMemberTimeSeries(
  userId: string,
  range: StatsRange,
  allTimeStart?: Date,
) {
  const supabase = await createClient();
  const metrics = ['uploads', 'views', 'likes', 'storage_added', 'followers_gained'] as const;
  const { bucket } = getRangeConfig(range, { allTimeStart });

  const series = await Promise.all(
    metrics.map(async (metric) => ({
      metric,
      points: await fetchTimeSeries(supabase, metric, range, userId, { allTimeStart }),
    })),
  );

  return { bucket, series };
}
