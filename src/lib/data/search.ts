import { cacheLife, cacheTag } from 'next/cache';
import { filterSearchResults } from '@/lib/auth/isTestProfile';
import { getGroupedMemberGearDiscovery } from '@/lib/data/memberGear';
import { searchGearPages } from '@/lib/gear/searchGearPages';
import { createPublicClient } from '@/utils/supabase/server';
import type { SearchResult, SearchEntityType } from '@/types/search';

export const ALL_SEARCH_ENTITY_TYPES: SearchEntityType[] = [
  'albums',
  'photos',
  'members',
  'events',
  'tags',
  'scene-events',
  'challenges',
  'gear',
];

function mergeSearchResults(results: SearchResult[], limit: number): SearchResult[] {
  return [...results]
    .sort((a, b) => {
      if (b.rank !== a.rank) {
        return b.rank - a.rank;
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}

/**
 * Search across all entity types using PostgreSQL Full-Text Search
 * Tagged with 'search' for cache invalidation
 *
 * @param query - Search query string (minimum 2 characters)
 * @param types - Entity types to search (defaults to all)
 * @param limit - Maximum number of results (defaults to 20)
 * @returns Array of search results ordered by relevance
 */
export async function searchEntities(
  query: string,
  types: SearchEntityType[] = ALL_SEARCH_ENTITY_TYPES,
  limit = 20,
  includeTestContent = false,
): Promise<SearchResult[]> {
  'use cache';
  // Cache search results for 5 minutes
  // Shorter than content cache since search queries vary widely
  // 5-minute TTL; stale: 0 matches next.config search profile
  cacheLife({ stale: 0, revalidate: 300, expire: 3600 });
  cacheTag('search');

  // Don't search if query is too short
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmed = query.trim();
  const includeGear = types.includes('gear');
  const rpcTypes = types.filter((type) => type !== 'gear');

  let results: SearchResult[] = [];

  if (rpcTypes.length > 0) {
    const supabase = createPublicClient();

    const { data, error } = await supabase.rpc('global_search', {
      search_query: trimmed,
      result_limit: limit,
      search_types: rpcTypes,
    });

    if (error) {
      console.error('Search error:', error);
    } else {
      results = filterSearchResults((data || []) as SearchResult[], includeTestContent);
    }
  }

  if (includeGear) {
    cacheTag('user-gear');
    const grouped = await getGroupedMemberGearDiscovery(includeTestContent);
    const gearHits = searchGearPages(grouped, trimmed);
    results = [...results, ...gearHits];
  }

  return mergeSearchResults(results, limit);
}
