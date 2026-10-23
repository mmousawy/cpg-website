import type { SearchEntityType, SearchResult } from '@/types/search';

/** Section order used by the search modal. Keyboard selection follows this order. */
export const SEARCH_RESULT_TYPE_ORDER: SearchEntityType[] = [
  'members',
  'gear',
  'events',
  'scene-events',
  'challenges',
  'albums',
  'photos',
  'tags',
];

const typeRank = new Map(SEARCH_RESULT_TYPE_ORDER.map((type, index) => [type, index]));

/**
 * Group results into the same sequence the modal renders.
 * Relevance order is kept inside each type.
 */
export function orderSearchResultsForDisplay(results: SearchResult[]): SearchResult[] {
  return results
    .map((result, index) => ({ result, index }))
    .sort((a, b) => {
      const typeDelta = (typeRank.get(a.result.entity_type) ?? Number.MAX_SAFE_INTEGER)
        - (typeRank.get(b.result.entity_type) ?? Number.MAX_SAFE_INTEGER);
      return typeDelta !== 0 ? typeDelta : a.index - b.index;
    })
    .map(({ result }) => result);
}
