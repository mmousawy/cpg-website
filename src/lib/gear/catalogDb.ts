import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import { gearAliasKey } from '@/lib/gear/gearAliasKey';
import { buildGearSearchText } from '@/lib/gear/buildSearchText';
import type { GearCatalogSource, GearCategory } from '@/lib/gear/types';

type AdminClient = SupabaseClient<Database>;

export type CatalogUpsertInput = {
  source: GearCatalogSource;
  sourceKey: string;
  category: GearCategory;
  brand: string;
  name: string;
  aliasStrings: string[];
};

export async function upsertCatalogEntry(
  supabase: AdminClient,
  input: CatalogUpsertInput,
): Promise<string | null> {
  const searchText = buildGearSearchText(input.brand, input.name);

  const { data: row, error } = await supabase
    .from('gear_catalog')
    .upsert(
      {
        source: input.source,
        source_key: input.sourceKey,
        category: input.category,
        brand: input.brand,
        name: input.name,
        search_text: searchText,
      },
      { onConflict: 'source,source_key' },
    )
    .select('id, source')
    .single();

  if (error || !row) {
    console.error('gear_catalog upsert failed', error);
    return null;
  }

  const aliasKeys = [...new Set(input.aliasStrings.map(gearAliasKey).filter(Boolean))];
  if (aliasKeys.length === 0) {
    return row.id;
  }

  for (const aliasKey of aliasKeys) {
    const { data: existing } = await supabase
      .from('gear_catalog_aliases')
      .select('catalog_id')
      .eq('alias_key', aliasKey)
      .maybeSingle();

    if (existing?.catalog_id && existing.catalog_id !== row.id) {
      const { data: oldRow } = await supabase
        .from('gear_catalog')
        .select('id, source')
        .eq('id', existing.catalog_id)
        .maybeSingle();

      if (oldRow?.source === 'exif' && row.source === 'lensfun') {
        await supabase
          .from('gear_catalog_aliases')
          .update({ catalog_id: row.id })
          .eq('alias_key', aliasKey);
        await maybeDeleteOrphanExifCatalog(supabase, oldRow.id);
        continue;
      }

      if (existing.catalog_id === row.id) {
        continue;
      }

      // Prefer non-exif catalog rows when both exist
      if (row.source !== 'exif') {
        await supabase
          .from('gear_catalog_aliases')
          .update({ catalog_id: row.id })
          .eq('alias_key', aliasKey);
        if (oldRow?.source === 'exif') {
          await maybeDeleteOrphanExifCatalog(supabase, oldRow.id);
        }
      }
      continue;
    }

    await supabase.from('gear_catalog_aliases').upsert(
      { alias_key: aliasKey, catalog_id: row.id },
      { onConflict: 'alias_key' },
    );
  }

  return row.id;
}

async function maybeDeleteOrphanExifCatalog(supabase: AdminClient, catalogId: string) {
  const { count } = await supabase
    .from('gear_catalog_aliases')
    .select('alias_key', { count: 'exact', head: true })
    .eq('catalog_id', catalogId);

  if (count === 0) {
    await supabase.from('gear_catalog').delete().eq('id', catalogId).eq('source', 'exif');
  }
}

export async function findCatalogIdByAlias(
  supabase: AdminClient,
  label: string,
): Promise<string | null> {
  const key = gearAliasKey(label);
  if (!key) return null;

  const { data } = await supabase
    .from('gear_catalog_aliases')
    .select('catalog_id')
    .eq('alias_key', key)
    .maybeSingle();

  return data?.catalog_id ?? null;
}

export async function ensureExifCatalogEntry(
  supabase: AdminClient,
  params: { category: GearCategory; brand: string; name: string; aliasStrings: string[] },
): Promise<string | null> {
  const existingId = await findCatalogIdByAlias(supabase, params.name);
  if (existingId) {
    return existingId;
  }

  const sourceKey = gearAliasKey(`${params.category}:${params.brand}:${params.name}`);
  return upsertCatalogEntry(supabase, {
    source: 'exif',
    sourceKey,
    category: params.category,
    brand: params.brand,
    name: params.name,
    aliasStrings: params.aliasStrings,
  });
}
