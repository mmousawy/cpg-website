import { matchesFuzzyTokens } from '@/lib/search/fuzzyQuery';
import type { SearchResult } from '@/types/search';

import { getHelpSearchIndex, type HelpSearchEntry } from './helpSearchIndex';

const DEFAULT_HELP_SEARCH_LIMIT = 8;

function scoreHelpMatch(entry: HelpSearchEntry, query: string): number | null {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return null;
  }

  const lowerQuery = trimmed.toLowerCase();
  const titleLower = entry.title.toLowerCase();
  const sectionLower = entry.sectionTitle.toLowerCase();

  if (titleLower.startsWith(lowerQuery)) {
    return 1.0;
  }
  if (titleLower.includes(lowerQuery)) {
    return 0.85;
  }
  if (sectionLower.includes(lowerQuery)) {
    return 0.7;
  }
  if (matchesFuzzyTokens(titleLower, trimmed)) {
    return 0.55;
  }
  if (matchesFuzzyTokens(entry.searchText, trimmed)) {
    return 0.4;
  }
  if (entry.searchText.includes(lowerQuery)) {
    return 0.35;
  }

  return null;
}

/**
 * Match help & FAQ accordion items for site search.
 */
export function searchHelpItems(
  query: string,
  limit = DEFAULT_HELP_SEARCH_LIMIT,
): SearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const scored = getHelpSearchIndex()
    .map((entry) => {
      const rank = scoreHelpMatch(entry, trimmed);
      return rank === null ? null : { entry, rank };
    })
    .filter((row): row is { entry: HelpSearchEntry; rank: number } => row !== null);

  scored.sort((a, b) => {
    if (b.rank !== a.rank) {
      return b.rank - a.rank;
    }
    return a.entry.title.localeCompare(b.entry.title);
  });

  return scored.slice(0, limit).map(({ entry, rank }) => ({
    entity_type: 'help',
    entity_id: entry.itemId,
    title: entry.title,
    subtitle: `${entry.sectionTitle} · Help`,
    image_url: null,
    image_blurhash: null,
    url: entry.url,
    rank,
  }));
}
