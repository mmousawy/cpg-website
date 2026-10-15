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

const PREFIX_CANDIDATE_LIMIT = 50;
const FUZZY_CANDIDATE_LIMIT = 50;

function withCatalogDisplayName(row: GearSearchResult): GearSearchResult {
  return {
    ...row,
    name: formatCatalogDisplayName(row.brand, row.name),
  };
}

/** Higher = better match for autocomplete ordering. */
export function rankGearSearchResult(name: string, query: string): number {
  const q = query.trim().toLowerCase();
  const n = name.toLowerCase();
  if (!q || !matchesFuzzyTokens(name, query)) {
    return -1;
  }
  if (n === q) {
    return 10_000;
  }
  if (n.startsWith(q)) {
    const rest = n.slice(q.length).trim();
    let score = 5_000 - (n.length - q.length);
    if (rest.length > 0 && rest.length <= 3 && /^[a-z0-9./-]+$/i.test(rest)) {
      score += 200 - rest.length * 10;
      if (/^[a-z]+$/i.test(rest)) {
        score += 60;
      }
    }
    return score;
  }
  let score = 1_000;
  const tokens = tokenizeSearchQuery(query);
  for (const token of tokens) {
    if (n.startsWith(token) || n.includes(` ${token}`)) {
      score += 100;
    }
  }
  score -= n.length * 0.5;
  return score;
}

export function rankAndLimitGearSearchResults(
  rows: GearSearchResult[],
  query: string,
  limit: number,
): GearSearchResult[] {
  const seenNames = new Set<string>();
  const ranked = rows
    .map((row) => ({
      row: withCatalogDisplayName(row),
      score: rankGearSearchResult(formatCatalogDisplayName(row.brand, row.name), query),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.row.name.localeCompare(b.row.name);
    });

  const out: GearSearchResult[] = [];
  for (const { row } of ranked) {
    const key = row.name.toLowerCase();
    if (seenNames.has(key)) {
      continue;
    }
    seenNames.add(key);
    out.push(row);
    if (out.length >= limit) {
      break;
    }
  }
  return out;
}

function escapeIlikeLiteral(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

function mergeCandidates(
  ...groups: Array<GearSearchResult[] | undefined | null>
): GearSearchResult[] {
  const byId = new Map<string, GearSearchResult>();
  for (const group of groups) {
    for (const row of group ?? []) {
      if (!byId.has(row.id)) {
        byId.set(row.id, row);
      }
    }
  }
  return [...byId.values()];
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

async function fetchCatalogRowsByIds(
  supabase: SupabaseClient<Database>,
  ids: string[],
  category?: GearCategory | null,
): Promise<GearSearchResult[]> {
  if (ids.length === 0) {
    return [];
  }
  let query = supabase
    .from('gear_catalog')
    .select('id, name, brand, category')
    .in('id', ids);
  if (category) {
    query = query.eq('category', category);
  }
  const { data } = await query;
  return (data ?? []) as GearSearchResult[];
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

  const prefixPattern = `${escapeIlikeLiteral(trimmed)}%`;
  const fuzzyPattern = buildFuzzyIlikePattern(trimmed);
  const aliasPattern = buildFuzzyAliasIlikePattern(trimmed);

  let prefixQuery = supabase
    .from('gear_catalog')
    .select('id, name, brand, category')
    .ilike('name', prefixPattern)
    .limit(PREFIX_CANDIDATE_LIMIT);

  let fuzzyQuery = supabase
    .from('gear_catalog')
    .select('id, name, brand, category')
    .ilike('search_text', fuzzyPattern)
    .limit(FUZZY_CANDIDATE_LIMIT);

  const aliasQuery = supabase
    .from('gear_catalog_aliases')
    .select('catalog_id')
    .ilike('alias_key', aliasPattern)
    .limit(PREFIX_CANDIDATE_LIMIT);

  if (category) {
    prefixQuery = prefixQuery.eq('category', category);
    fuzzyQuery = fuzzyQuery.eq('category', category);
  }

  const [
    { data: prefixRows, error: prefixError },
    { data: fuzzyRows, error: fuzzyError },
    { data: aliasHits, error: aliasError },
  ] = await Promise.all([prefixQuery, fuzzyQuery, aliasQuery]);

  if (prefixError || fuzzyError) {
    console.error('gear search failed', prefixError ?? fuzzyError);
    return searchCuratedFallback(trimmed, category, limit);
  }
  if (aliasError) {
    console.error('gear alias search failed', aliasError);
  }

  const aliasIds = (aliasHits ?? [])
    .map((hit) => hit.catalog_id)
    .filter((id): id is string => Boolean(id));

  const aliasRows = await fetchCatalogRowsByIds(supabase, aliasIds, category);

  const aliasKey = gearAliasKey(trimmed);
  let exactAliasRows: GearSearchResult[] = [];
  if (aliasKey) {
    const { data: aliasHit } = await supabase
      .from('gear_catalog_aliases')
      .select('catalog_id')
      .eq('alias_key', aliasKey)
      .maybeSingle();
    if (aliasHit?.catalog_id) {
      exactAliasRows = await fetchCatalogRowsByIds(supabase, [aliasHit.catalog_id], category);
    }
  }

  const candidates = mergeCandidates(
    prefixRows as GearSearchResult[],
    fuzzyRows as GearSearchResult[],
    aliasRows,
    exactAliasRows,
  );

  if (candidates.length > 0) {
    return rankAndLimitGearSearchResults(candidates, trimmed, limit);
  }

  return searchCuratedFallback(trimmed, category, limit);
}
