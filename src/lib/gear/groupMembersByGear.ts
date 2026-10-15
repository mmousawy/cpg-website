import { gearAliasKey } from '@/lib/gear/gearAliasKey';
import {
  SHOOTING_FORMAT_LABELS,
  SHOOTING_FORMATS,
  type ShootingFormat,
} from '@/lib/gear/types';

export type MemberForGearDiscovery = {
  id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
};

export type MemberGearDiscoveryRow = MemberForGearDiscovery & {
  formats: ShootingFormat[];
  formats_other: string;
  daily_driver_body: string;
  daily_driver_body_catalog_id: string | null;
  daily_driver_lens: string;
  daily_driver_lens_catalog_id: string | null;
};

export type GearMemberGroup = {
  /** Format slug or gearAliasKey for camera/lens */
  key: string;
  label: string;
  members: MemberForGearDiscovery[];
};

export type GroupedMemberGear = {
  byFormat: GearMemberGroup[];
  byCamera: GearMemberGroup[];
  byLens: GearMemberGroup[];
};

type GroupAccumulator = {
  label: string;
  labelFromCatalog: boolean;
  members: MemberForGearDiscovery[];
  memberIds: Set<string>;
};

function resolveDriverLabel(
  text: string,
  catalogId: string | null,
  catalogNamesById: Map<string, string>,
): { label: string; fromCatalog: boolean } | null {
  const trimmed = text.trim();
  const catalogName = catalogId ? catalogNamesById.get(catalogId)?.trim() : '';
  if (catalogName) {
    return { label: catalogName, fromCatalog: true };
  }
  if (trimmed) {
    return { label: trimmed, fromCatalog: false };
  }
  return null;
}

function upsertNamedGroup(
  map: Map<string, GroupAccumulator>,
  resolved: { label: string; fromCatalog: boolean },
  member: MemberForGearDiscovery,
) {
  const key = gearAliasKey(resolved.label);
  const existing = map.get(key);
  if (!existing) {
    map.set(key, {
      label: resolved.label,
      labelFromCatalog: resolved.fromCatalog,
      members: [member],
      memberIds: new Set([member.id]),
    });
    return;
  }

  if (!existing.memberIds.has(member.id)) {
    existing.members.push(member);
    existing.memberIds.add(member.id);
  }

  if (resolved.fromCatalog && !existing.labelFromCatalog) {
    existing.label = resolved.label;
    existing.labelFromCatalog = true;
  } else if (resolved.fromCatalog && existing.labelFromCatalog && resolved.label !== existing.label) {
    if (resolved.label.length > existing.label.length) {
      existing.label = resolved.label;
    }
  }
}

function finalizeGroups(map: Map<string, GroupAccumulator>): GearMemberGroup[] {
  const groups = Array.from(map.entries()).map(([key, acc]) => ({
    key,
    label: acc.label,
    members: acc.members,
  }));

  return sortGearMemberGroups(groups);
}

export function sortGearMemberGroups(groups: GearMemberGroup[]): GearMemberGroup[] {
  return [...groups].sort((a, b) => {
    if (b.members.length !== a.members.length) {
      return b.members.length - a.members.length;
    }
    return a.label.localeCompare(b.label);
  });
}

export function groupMembersByGear(
  rows: MemberGearDiscoveryRow[],
  catalogNamesById: Map<string, string>,
): GroupedMemberGear {
  const formatMap = new Map<ShootingFormat, GroupAccumulator>();
  const cameraMap = new Map<string, GroupAccumulator>();
  const lensMap = new Map<string, GroupAccumulator>();

  for (const row of rows) {
    const member: MemberForGearDiscovery = {
      id: row.id,
      full_name: row.full_name,
      nickname: row.nickname,
      avatar_url: row.avatar_url,
    };

    for (const format of row.formats) {
      if (!SHOOTING_FORMATS.includes(format)) continue;
      const label = SHOOTING_FORMAT_LABELS[format];
      const existing = formatMap.get(format);
      if (!existing) {
        formatMap.set(format, {
          label,
          labelFromCatalog: false,
          members: [member],
          memberIds: new Set([member.id]),
        });
      } else if (!existing.memberIds.has(member.id)) {
        existing.members.push(member);
        existing.memberIds.add(member.id);
      }
    }

    const body = resolveDriverLabel(
      row.daily_driver_body,
      row.daily_driver_body_catalog_id,
      catalogNamesById,
    );
    if (body) {
      upsertNamedGroup(cameraMap, body, member);
    }

    const lens = resolveDriverLabel(
      row.daily_driver_lens,
      row.daily_driver_lens_catalog_id,
      catalogNamesById,
    );
    if (lens) {
      upsertNamedGroup(lensMap, lens, member);
    }
  }

  const byFormat = sortGearMemberGroups(
    Array.from(formatMap.entries()).map(([format, acc]) => ({
      key: format,
      label: acc.label,
      members: acc.members,
    })),
  );

  return {
    byFormat,
    byCamera: finalizeGroups(cameraMap),
    byLens: finalizeGroups(lensMap),
  };
}

export function findGearMemberGroupByName(
  groups: GearMemberGroup[],
  nameParam: string,
): GearMemberGroup | null {
  const decoded = nameParam.trim();
  if (!decoded) return null;

  const key = gearAliasKey(decoded);
  const byKey = groups.find((g) => g.key === key);
  if (byKey) return byKey;

  const lower = decoded.toLowerCase();
  return groups.find((g) => g.label.toLowerCase() === lower) ?? null;
}

export function isShootingFormatSlug(value: string): value is ShootingFormat {
  return (SHOOTING_FORMATS as readonly string[]).includes(value);
}
