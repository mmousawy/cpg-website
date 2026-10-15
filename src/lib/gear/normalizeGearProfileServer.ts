import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import { gearAliasKey } from '@/lib/gear/gearAliasKey';
import {
  normalizeGearItemsList,
  resolveGearLabelCasing,
} from '@/lib/gear/canonicalGearItem';
import { formatCatalogDisplayName } from '@/lib/gear/formatCatalogDisplayName';
import type { GearCategory, UserGearProfile } from '@/lib/gear/types';

type DbClient = SupabaseClient<Database>;

async function loadCatalogDisplayNames(
  supabase: DbClient,
  ids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) {
    return map;
  }

  const { data } = await supabase
    .from('gear_catalog')
    .select('id, name, brand')
    .in('id', unique);

  for (const row of data ?? []) {
    map.set(row.id, formatCatalogDisplayName(row.brand, row.name));
  }
  return map;
}

async function resolveCatalogLabelsByAlias(
  supabase: DbClient,
  labels: Array<{ label: string; category: GearCategory }>,
): Promise<Map<string, { id: string; name: string; category: GearCategory }>> {
  const keys = [...new Set(labels.map((entry) => gearAliasKey(entry.label)).filter(Boolean))];
  const map = new Map<string, { id: string; name: string; category: GearCategory }>();
  if (keys.length === 0) {
    return map;
  }

  const { data: aliasRows } = await supabase
    .from('gear_catalog_aliases')
    .select('alias_key, catalog_id')
    .in('alias_key', keys);

  const catalogIds = [...new Set((aliasRows ?? []).map((row) => row.catalog_id).filter(Boolean))];
  if (catalogIds.length === 0) {
    return map;
  }

  const { data: catalogRows } = await supabase
    .from('gear_catalog')
    .select('id, name, brand, category')
    .in('id', catalogIds);

  const catalogById = new Map(
    (catalogRows ?? []).map((row) => [
      row.id,
      {
        id: row.id,
        name: formatCatalogDisplayName(row.brand, row.name),
        category: row.category as GearCategory,
      },
    ]),
  );

  for (const aliasRow of aliasRows ?? []) {
    const catalog = catalogById.get(aliasRow.catalog_id);
    if (catalog) {
      map.set(aliasRow.alias_key, catalog);
    }
  }

  return map;
}

function lookupCatalogHit(
  catalogByAlias: Map<string, { id: string; name: string; category: GearCategory }>,
  label: string,
  category: GearCategory,
): { id: string; name: string } | null {
  const key = gearAliasKey(label);
  if (!key) {
    return null;
  }
  const hit = catalogByAlias.get(key);
  if (!hit || hit.category !== category) {
    return null;
  }
  return { id: hit.id, name: hit.name };
}

async function enrichItemsWithCatalog(
  supabase: DbClient,
  items: UserGearProfile['items'],
  catalogByAlias: Map<string, { id: string; name: string; category: GearCategory }>,
): Promise<UserGearProfile['items']> {
  return items.map((item) => {
    if (item.catalogId) {
      return item;
    }
    const hit = lookupCatalogHit(catalogByAlias, item.name, item.category);
    if (!hit) {
      return item;
    }
    return { ...item, catalogId: hit.id, name: hit.name };
  });
}

function normalizeDailyDriverField(
  text: string,
  catalogId: string | null,
  category: GearCategory,
  items: UserGearProfile['items'],
  catalogDisplayNameById: Map<string, string>,
): { text: string; catalogId: string | null } {
  const resolved = resolveGearLabelCasing({
    text,
    category,
    catalogId,
    catalogLabel: catalogId ? catalogDisplayNameById.get(catalogId) : undefined,
    peerItems: items.filter((item) => item.category === category),
  });
  return { text: resolved.name, catalogId: resolved.catalogId };
}

export async function normalizeGearProfileServer(
  supabase: DbClient,
  profile: UserGearProfile,
): Promise<UserGearProfile> {
  const aliasLookups: Array<{ label: string; category: GearCategory }> = [];
  for (const item of profile.items) {
    if (!item.catalogId) {
      aliasLookups.push({ label: item.name, category: item.category });
    }
  }
  if (profile.dailyDriverBody.trim() && !profile.dailyDriverBodyCatalogId) {
    aliasLookups.push({ label: profile.dailyDriverBody, category: 'camera_body' });
  }
  if (profile.dailyDriverLens.trim() && !profile.dailyDriverLensCatalogId) {
    aliasLookups.push({ label: profile.dailyDriverLens, category: 'lens' });
  }

  const catalogByAlias = await resolveCatalogLabelsByAlias(supabase, aliasLookups);
  let items = await enrichItemsWithCatalog(supabase, profile.items, catalogByAlias);

  const catalogIds = [
    ...items.map((item) => item.catalogId),
    profile.dailyDriverBodyCatalogId,
    profile.dailyDriverLensCatalogId,
  ].filter((id): id is string => Boolean(id));

  const catalogDisplayNameById = await loadCatalogDisplayNames(supabase, catalogIds);
  items = normalizeGearItemsList(items, catalogDisplayNameById);

  let dailyDriverBody = profile.dailyDriverBody;
  let dailyDriverBodyCatalogId = profile.dailyDriverBodyCatalogId;
  if (dailyDriverBody.trim()) {
    if (!dailyDriverBodyCatalogId) {
      const hit = lookupCatalogHit(catalogByAlias, dailyDriverBody, 'camera_body');
      if (hit) {
        dailyDriverBodyCatalogId = hit.id;
        dailyDriverBody = hit.name;
        catalogDisplayNameById.set(hit.id, hit.name);
      }
    }
    const bodyResolved = normalizeDailyDriverField(
      dailyDriverBody,
      dailyDriverBodyCatalogId,
      'camera_body',
      items,
      catalogDisplayNameById,
    );
    dailyDriverBody = bodyResolved.text;
    dailyDriverBodyCatalogId = bodyResolved.catalogId;
  }

  let dailyDriverLens = profile.dailyDriverLens;
  let dailyDriverLensCatalogId = profile.dailyDriverLensCatalogId;
  if (dailyDriverLens.trim()) {
    if (!dailyDriverLensCatalogId) {
      const hit = lookupCatalogHit(catalogByAlias, dailyDriverLens, 'lens');
      if (hit) {
        dailyDriverLensCatalogId = hit.id;
        dailyDriverLens = hit.name;
        catalogDisplayNameById.set(hit.id, hit.name);
      }
    }
    const lensResolved = normalizeDailyDriverField(
      dailyDriverLens,
      dailyDriverLensCatalogId,
      'lens',
      items,
      catalogDisplayNameById,
    );
    dailyDriverLens = lensResolved.text;
    dailyDriverLensCatalogId = lensResolved.catalogId;
  }

  return {
    ...profile,
    items,
    dailyDriverBody,
    dailyDriverBodyCatalogId,
    dailyDriverLens,
    dailyDriverLensCatalogId,
  };
}
