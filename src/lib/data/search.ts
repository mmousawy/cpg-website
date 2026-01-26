import { cacheLife, cacheTag } from 'next/cache';
import { createPublicClient } from '@/utils/supabase/server';
import type { SearchResult, SearchEntityType } from '@/types/search';

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
  types: SearchEntityType[] = ['albums', 'photos', 'members', 'events', 'tags'],
  limit = 20,
): Promise<SearchResult[]> {
  'use cache';
  // Cache search results for 5 minutes
  // Shorter than content cache since search queries vary widely
  cacheLife({ revalidate: 300 });
  cacheTag('search');

  // Don't search if query is too short
  if (!query || query.trim().length < 2) {
    return [];
  }

  const supabase = createPublicClient();

  const { data, error } = await supabase.rpc('global_search', {
    search_query: query.trim(),
    result_limit: limit,
    search_types: types.length > 0 ? types : ['albums', 'photos', 'members', 'events', 'tags'],
  });

  if (error) {
    console.error('Search error:', error);
    return [];
  }

  return (data || []) as SearchResult[];
}
