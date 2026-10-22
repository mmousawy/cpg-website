import {
  isShootingFormatSlug,
  type GearMemberGroup,
  type GroupedMemberGear,
} from '@/lib/gear/groupMembersByGear';
import { gearAliasKey } from '@/lib/gear/gearAliasKey';
import {
  membersDailyDriverCameraPath,
  membersDailyDriverLensPath,
  membersShootingFormatPath,
} from '@/lib/gear/memberGearPaths';
import type { SearchResult } from '@/types/search';

const DEFAULT_GEAR_SEARCH_LIMIT = 8;

type GearPageKind = 'camera' | 'lens' | 'format';

type ScoredGearHit = {
  kind: GearPageKind;
  group: GearMemberGroup;
  rank: number;
};

function memberCountSubtitle(kind: GearPageKind, count: number): string {
  const noun = count === 1 ? 'member' : 'members';
  if (kind === 'camera') {
    return `Camera · ${count} ${noun}`;
  }
  if (kind === 'lens') {
    return `Lens · ${count} ${noun}`;
  }
  return `Shooting style · ${count} ${noun}`;
}

function scoreGearLabelMatch(label: string, query: string): number | null {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return null;
  }

  const lowerLabel = label.toLowerCase();
  const lowerQuery = trimmedQuery.toLowerCase();

  if (lowerLabel.startsWith(lowerQuery)) {
    return 1.0;
  }
  if (lowerLabel.includes(lowerQuery)) {
    return 0.5;
  }

  const aliasLabel = gearAliasKey(label);
  const aliasQuery = gearAliasKey(trimmedQuery);
  if (aliasQuery.length >= 2 && aliasLabel.includes(aliasQuery)) {
    return 0.35;
  }

  return null;
}

function collectHits(
  groups: GearMemberGroup[],
  kind: GearPageKind,
  query: string,
): ScoredGearHit[] {
  const hits: ScoredGearHit[] = [];

  for (const group of groups) {
    const rank = scoreGearLabelMatch(group.label, query);
    if (rank === null) {
      continue;
    }
    hits.push({ kind, group, rank });
  }

  return hits;
}

function gearResultUrl(kind: GearPageKind, group: GearMemberGroup): string | null {
  if (kind === 'camera') {
    return membersDailyDriverCameraPath(group.label);
  }
  if (kind === 'lens') {
    return membersDailyDriverLensPath(group.label);
  }
  if (isShootingFormatSlug(group.key)) {
    return membersShootingFormatPath(group.key);
  }
  return null;
}

function toSearchResult(hit: ScoredGearHit): SearchResult | null {
  const url = gearResultUrl(hit.kind, hit.group);
  if (!url) {
    return null;
  }

  const count = hit.group.members.length;

  return {
    entity_type: 'gear',
    entity_id: `${hit.kind}:${hit.group.key}`,
    title: hit.group.label,
    subtitle: memberCountSubtitle(hit.kind, count),
    image_url: null,
    image_blurhash: null,
    url,
    rank: hit.rank + Math.min(count, 50) * 0.001,
  };
}

/**
 * Match public gear discovery pages (camera / lens / shooting format) for site search.
 */
export function searchGearPages(
  grouped: GroupedMemberGear,
  query: string,
  limit = DEFAULT_GEAR_SEARCH_LIMIT,
): SearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const allHits: ScoredGearHit[] = [
    ...collectHits(grouped.byCamera, 'camera', trimmed),
    ...collectHits(grouped.byLens, 'lens', trimmed),
    ...collectHits(grouped.byFormat, 'format', trimmed),
  ];

  allHits.sort((a, b) => {
    if (b.rank !== a.rank) {
      return b.rank - a.rank;
    }
    if (b.group.members.length !== a.group.members.length) {
      return b.group.members.length - a.group.members.length;
    }
    return a.group.label.localeCompare(b.group.label);
  });

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const hit of allHits) {
    const dedupeKey = `${hit.kind}:${hit.group.key}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    const row = toSearchResult(hit);
    if (row) {
      results.push(row);
    }
    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

/** Parse `entity_id` from a gear search row (`camera:…`, `lens:…`, `format:…`). */
export function parseGearSearchEntityId(entityId: string): {
  kind: GearPageKind;
  key: string;
} | null {
  const match = entityId.match(/^(camera|lens|format):(.+)$/);
  if (!match) {
    return null;
  }
  return { kind: match[1] as GearPageKind, key: match[2] };
}
