import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import { gearAliasKey } from '@/lib/gear/gearAliasKey';
import { CURATED_GEAR } from '@/lib/gear/curatedPhones';
import { formatCatalogDisplayName } from '@/lib/gear/formatCatalogDisplayName';
import type { GearCategory } from '@/lib/gear/types';
import {
  buildFuzzyIlikePattern,
  matchesFuzzyTokens,
  tokenizeSearchQuery,
} from '@/lib/search/fuzzyQuery';

export type GearSearchResult = {
  id: string;
  name: string;
  brand: string;
  category: GearCategory;
};

function withCatalogDisplayName(row: GearSearchResult): GearSearchResult {
  return {
    ...row,
    name: formatCatalogDisplayName(row.brand, row.name),
  };
}

function searchCuratedFallback(
  query: string,
  category?: GearCategory | null,
  limit = 8,
): GearSearchResult[] {
  if (!query.trim()) return [];

  return CURATED_GEAR
    .filter((entry) => {
      if (category && entry.category !== category) return false;
      const label = formatCatalogDisplayName(entry.brand, entry.name);
      return matchesFuzzyTokens(label, query);
    })
    .slice(0, limit)
    .map((entry) => ({
      id: `curated:${entry.sourceKey}`,
      brand: entry.brand,
      name: formatCatalogDisplayName(entry.brand, entry.name),
      category: entry.category,
    }));
}

export async function searchGearCatalog(
  supabase: SupabaseClient<Database>,
  query: string,
  category?: GearCategory | null,
  limit = 8,
): Promise<GearSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const aliasKey = gearAliasKey(trimmed);
  if (aliasKey) {
    const { data: aliasHit } = await supabase
      .from('gear_catalog_aliases')
      .select('catalog_id')
      .eq('alias_key', aliasKey)
      .maybeSingle();

    if (aliasHit?.catalog_id) {
      let exactQuery = supabase
        .from('gear_catalog')
        .select('id, name, brand, category')
        .eq('id', aliasHit.catalog_id);
      if (category) {
        exactQuery = exactQuery.eq('category', category);
      }
      const { data: exactRow } = await exactQuery.maybeSingle();
      if (exactRow) {
        return [withCatalogDisplayName(exactRow as GearSearchResult)];
      }
    }
  }

  const pattern = buildFuzzyIlikePattern(trimmed);
  const aliasPattern = buildFuzzyAliasIlikePattern(trimmed);

  let dbQuery = supabase
    .from('gear_catalog')
    .select('id, name, brand, category')
    .ilike('search_text', pattern)
    .order('name', { ascending: true })
    .limit(limit);

  if (category) {
    dbQuery = dbQuery.eq('category', category);
  }

  const aliasQuery = supabase
    .from('gear_catalog_aliases')
    .select('catalog_id')
    .ilike('alias_key', aliasPattern)
    .limit(limit);

  const [{ data, error }, { data: aliasHits, error: aliasError }] = await Promise.all([
    dbQuery,
    aliasQuery,
  ]);

  if (error) {
    console.error('gear search failed', error);
    return searchCuratedFallback(trimmed, category, limit);
  }
  if (aliasError) {
    console.error('gear alias search failed', aliasError);
  }

  const rows = (data ?? []) as GearSearchResult[];
  const seen = new Set(rows.map((r) => r.id));

  const extraIds = (aliasHits ?? [])
    .map((h) => h.catalog_id)
    .filter((id): id is string => Boolean(id) && !seen.has(id));

  if (extraIds.length > 0) {
    let extraQuery = supabase
      .from('gear_catalog')
      .select('id, name, brand, category')
      .in('id', extraIds.slice(0, limit));
    if (category) {
      extraQuery = extraQuery.eq('category', category);
    }
    const { data: extraRows } = await extraQuery;
    for (const row of (extraRows ?? []) as GearSearchResult[]) {
      if (rows.length >= limit) break;
      if (!seen.has(row.id)) {
        seen.add(row.id);
        rows.push(row);
      }
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (rows.length > 0) {
    return rows.slice(0, limit).map(withCatalogDisplayName);
  }

  return searchCuratedFallback(trimmed, category, limit);
}

/** ILIKE on alias_key (punctuation-stripped, no spaces). */
function buildFuzzyAliasIlikePattern(query: string): string {
  const tokens = tokenizeSearchQuery(query)
    .map((t) => gearAliasKey(t))
    .filter(Boolean);
  if (tokens.length === 0) {
    return '%';
  }
  return `%${tokens.join('%')}%`;
}
