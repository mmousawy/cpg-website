import { cacheLife, cacheTag } from 'next/cache';

import type { Database } from '@/database.types';
import { filterMemberNicknames } from '@/lib/auth/isTestProfile';
import {
  findGearMemberGroupByName,
  groupMembersByGear,
  sortGearMemberGroups,
  type GearMemberGroup,
  type GroupedMemberGear,
  type MemberForGearDiscovery,
  type MemberGearDiscoveryRow,
  isShootingFormatSlug,
} from '@/lib/gear/groupMembersByGear';
import { SHOOTING_FORMAT_LABELS, type ShootingFormat } from '@/lib/gear/types';
import { createPublicClient } from '@/utils/supabase/server';

type ProfileJoinRow = {
  formats: Database['public']['Enums']['shooting_format'][];
  formats_other: string;
  daily_driver_body: string;
  daily_driver_body_catalog_id: string | null;
  daily_driver_lens: string;
  daily_driver_lens_catalog_id: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
  };
};

async function loadMemberGearDiscoveryRows(): Promise<{
  rows: MemberGearDiscoveryRow[];
  catalogNamesById: Map<string, string>;
}> {
  const supabase = createPublicClient();
  const pageSize = 1000;
  const rawRows: ProfileJoinRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('user_gear_profiles')
      .select(`
        formats,
        formats_other,
        daily_driver_body,
        daily_driver_body_catalog_id,
        daily_driver_lens,
        daily_driver_lens_catalog_id,
        profiles!inner(id, full_name, nickname, avatar_url)
      `)
      .not('profiles.nickname', 'is', null)
      .range(from, from + pageSize - 1);

    if (error || !data) {
      break;
    }

    rawRows.push(...(data as ProfileJoinRow[]));
    if (data.length < pageSize) break;
  }

  const catalogIds = new Set<string>();
  for (const row of rawRows) {
    if (row.daily_driver_body_catalog_id) {
      catalogIds.add(row.daily_driver_body_catalog_id);
    }
    if (row.daily_driver_lens_catalog_id) {
      catalogIds.add(row.daily_driver_lens_catalog_id);
    }
  }

  const catalogNamesById = new Map<string, string>();
  if (catalogIds.size > 0) {
    const { data: catalogRows } = await supabase
      .from('gear_catalog')
      .select('id, name')
      .in('id', Array.from(catalogIds));

    for (const row of catalogRows ?? []) {
      catalogNamesById.set(row.id, row.name);
    }
  }

  const rows: MemberGearDiscoveryRow[] = rawRows.map((row) => ({
    id: row.profiles.id,
    full_name: row.profiles.full_name,
    nickname: row.profiles.nickname,
    avatar_url: row.profiles.avatar_url,
    formats: row.formats as ShootingFormat[],
    formats_other: row.formats_other,
    daily_driver_body: row.daily_driver_body,
    daily_driver_body_catalog_id: row.daily_driver_body_catalog_id,
    daily_driver_lens: row.daily_driver_lens,
    daily_driver_lens_catalog_id: row.daily_driver_lens_catalog_id,
  }));

  return { rows, catalogNamesById };
}

function applyTestFilter(
  grouped: GroupedMemberGear,
  includeTestContent: boolean,
): GroupedMemberGear {
  const filterGroup = (group: GearMemberGroup): GearMemberGroup => ({
    ...group,
    members: filterMemberNicknames(group.members, includeTestContent),
  });

  const byFormat = sortGearMemberGroups(
    grouped.byFormat.map(filterGroup).filter((g) => g.members.length > 0),
  );
  const byCamera = sortGearMemberGroups(
    grouped.byCamera.map(filterGroup).filter((g) => g.members.length > 0),
  );
  const byLens = sortGearMemberGroups(
    grouped.byLens.map(filterGroup).filter((g) => g.members.length > 0),
  );

  return { byFormat, byCamera, byLens };
}

/**
 * Cached grouping of members by shooting format and daily driver gear.
 */
export async function getGroupedMemberGearDiscovery(
  includeTestContent = false,
): Promise<GroupedMemberGear> {
  'use cache';
  cacheLife('tagged');
  cacheTag('user-gear');
  cacheTag('profiles');

  const { rows, catalogNamesById } = await loadMemberGearDiscoveryRows();
  const grouped = groupMembersByGear(rows, catalogNamesById);
  return applyTestFilter(grouped, includeTestContent);
}

export async function getPopularShootingFormatGroups(
  limit = 20,
  includeTestContent = false,
): Promise<GearMemberGroup[]> {
  const { byFormat } = await getGroupedMemberGearDiscovery(includeTestContent);
  return byFormat.slice(0, limit);
}

export async function getPopularDailyDriverCameraGroups(
  limit = 20,
  includeTestContent = false,
): Promise<GearMemberGroup[]> {
  const { byCamera } = await getGroupedMemberGearDiscovery(includeTestContent);
  return byCamera.slice(0, limit);
}

export async function getPopularDailyDriverLensGroups(
  limit = 20,
  includeTestContent = false,
): Promise<GearMemberGroup[]> {
  const { byLens } = await getGroupedMemberGearDiscovery(includeTestContent);
  return byLens.slice(0, limit);
}

export async function getMembersByShootingFormat(
  formatSlug: string,
  includeTestContent = false,
): Promise<{ format: ShootingFormat | null; label: string; members: MemberForGearDiscovery[] }> {
  if (!isShootingFormatSlug(formatSlug)) {
    return { format: null, label: '', members: [] };
  }

  const { byFormat } = await getGroupedMemberGearDiscovery(includeTestContent);
  const group = byFormat.find((g) => g.key === formatSlug);
  return {
    format: formatSlug,
    label: SHOOTING_FORMAT_LABELS[formatSlug],
    members: group?.members ?? [],
  };
}

export async function getMembersByDailyDriverCamera(
  nameParam: string,
  includeTestContent = false,
): Promise<{ label: string | null; members: MemberForGearDiscovery[] }> {
  const decoded = decodeURIComponent(nameParam);
  const { byCamera } = await getGroupedMemberGearDiscovery(includeTestContent);
  const group = findGearMemberGroupByName(byCamera, decoded);
  return {
    label: group?.label ?? null,
    members: group?.members ?? [],
  };
}

export async function getMembersByDailyDriverLens(
  nameParam: string,
  includeTestContent = false,
): Promise<{ label: string | null; members: MemberForGearDiscovery[] }> {
  const decoded = decodeURIComponent(nameParam);
  const { byLens } = await getGroupedMemberGearDiscovery(includeTestContent);
  const group = findGearMemberGroupByName(byLens, decoded);
  return {
    label: group?.label ?? null,
    members: group?.members ?? [],
  };
}

export type MemberGearDiscoverySummary = {
  popularFormats: GearMemberGroup[];
  popularCameras: GearMemberGroup[];
  popularLenses: GearMemberGroup[];
};

export async function getMemberGearDiscoverySummary(
  includeTestContent = false,
): Promise<MemberGearDiscoverySummary> {
  const grouped = await getGroupedMemberGearDiscovery(includeTestContent);
  return {
    popularFormats: grouped.byFormat.slice(0, 20),
    popularCameras: grouped.byCamera.slice(0, 20),
    popularLenses: grouped.byLens.slice(0, 20),
  };
}
