/**
 * Token-based "fuzzy" matching: every word in the query must appear in order in the
 * haystack, but not necessarily adjacent (e.g. "canon r7" matches "Canon EOS R7").
 */

export function tokenizeSearchQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[%_]/g, ''))
    .filter((token) => token.length > 0);
}

/** SQL ILIKE pattern: `%token1%token2%` */
export function buildFuzzyIlikePattern(query: string): string {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) {
    return '%';
  }
  return `%${tokens.join('%')}%`;
}

export function matchesFuzzyTokens(haystack: string, query: string): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) {
    return false;
  }
  const normalized = haystack.toLowerCase();
  return tokens.every((token) => normalized.includes(token));
}

/** PostgREST `.or()` filter: each field is matched with the same gap-tolerant ILIKE pattern. */
export function buildPostgrestIlikeOr(fields: string[], query: string): string {
  const pattern = buildFuzzyIlikePattern(query);
  return fields.map((field) => `${field}.ilike.${pattern}`).join(',');
}
