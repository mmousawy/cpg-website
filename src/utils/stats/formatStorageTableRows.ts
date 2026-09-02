import type { AdminStatsOverview, StatsRankedItem } from '@/types/stats';

export function formatStorageTableRows(
  rows: AdminStatsOverview['storageByMember'],
): StatsRankedItem[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.nickname ? `@${row.nickname}` : row.full_name || 'Member',
    subtitle: `${row.photo_count} photos`,
    value: row.storage_bytes,
    href: row.nickname ? `/@${row.nickname}` : undefined,
  }));
}
