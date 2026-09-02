import { fetchTimeSeries } from '@/lib/data/statsTimeSeries';
import type { AdminStatsOverview, StatsRange, StatsRankedItem } from '@/types/stats';
import { createClient } from '@/utils/supabase/server';

export type { AdminStatsOverview };

function mapRankedPhoto(
  row: {
    id: string;
    short_id: string;
    title: string | null;
    url: string;
    blurhash: string | null;
    value: number;
    nickname: string | null;
  },
): StatsRankedItem {
  return {
    id: row.id,
    title: row.title || 'Untitled',
    subtitle: row.nickname ? `@${row.nickname}` : undefined,
    value: row.value,
    href: row.nickname ? `/@${row.nickname}/photo/${row.short_id}` : undefined,
    imageUrl: row.url,
    blurhash: row.blurhash,
  };
}

export async function getAdminStatsOverview(): Promise<AdminStatsOverview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_admin_stats_overview');

  if (error || !data) {
    console.error('getAdminStatsOverview:', error);
    return null;
  }

  const raw = data as Record<string, unknown>;

  return {
    kpis: raw.kpis as Record<string, number>,
    health: raw.health as Record<string, number>,
    preferences: {
      themes: (raw.preferences as AdminStatsOverview['preferences']).themes ?? [],
      albumCardStyles: (raw.preferences as AdminStatsOverview['preferences']).albumCardStyles ?? [],
      defaultLicenses: (raw.preferences as AdminStatsOverview['preferences']).defaultLicenses ?? [],
      newsletterOptIn: (raw.preferences as { newsletterOptIn: number }).newsletterOptIn ?? 0,
      watermarkEnabled: (raw.preferences as { watermarkEnabled: number }).watermarkEnabled ?? 0,
      embedCopyrightExif: (raw.preferences as { embedCopyrightExif: number }).embedCopyrightExif ?? 0,
      topInterests: (raw.preferences as AdminStatsOverview['preferences']).topInterests ?? [],
      emailOptOuts: (raw.preferences as AdminStatsOverview['preferences']).emailOptOuts ?? [],
    },
    topPhotosByViews: ((raw.topPhotosByViews as unknown[]) ?? []).map((r) =>
      mapRankedPhoto(r as Parameters<typeof mapRankedPhoto>[0]),
    ),
    topPhotosByLikes: ((raw.topPhotosByLikes as unknown[]) ?? []).map((r) =>
      mapRankedPhoto(r as Parameters<typeof mapRankedPhoto>[0]),
    ),
    storageByMember: (raw.storageByMember as AdminStatsOverview['storageByMember']) ?? [],
  };
}

export async function getAdminTimeSeries(range: StatsRange) {
  const supabase = await createClient();
  const metrics = ['signups', 'uploads', 'views', 'likes', 'comments', 'storage_added', 'photos_deleted'] as const;

  const series = await Promise.all(
    metrics.map(async (metric) => ({
      metric,
      points: await fetchTimeSeries(supabase, metric, range),
    })),
  );

  return series;
}

export async function getAdminMemberStats(params: {
  search?: string;
  filter?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_admin_member_stats', {
    p_search: params.search ?? '',
    p_filter: params.filter ?? 'all',
    p_sort_by: params.sortBy ?? 'created_at',
    p_sort_order: params.sortOrder ?? 'desc',
    p_page: params.page ?? 1,
    p_limit: params.limit ?? 50,
  });

  if (error || !data) {
    console.error('getAdminMemberStats:', error);
    return null;
  }

  return data as {
    members: unknown[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
