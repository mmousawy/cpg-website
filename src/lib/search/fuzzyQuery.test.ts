import { describe, expect, it } from 'vitest';
import {
  buildFuzzyIlikePattern,
  matchesFuzzyTokens,
  tokenizeSearchQuery,
} from './fuzzyQuery';

describe('fuzzyQuery', () => {
  it('tokenizes and builds gap-tolerant ilike patterns', () => {
    expect(tokenizeSearchQuery('  Canon   R7 ')).toEqual(['canon', 'r7']);
    expect(buildFuzzyIlikePattern('canon r7')).toBe('%canon%r7%');
  });

  it('matches when tokens appear non-adjacently', () => {
    expect(matchesFuzzyTokens('Canon EOS R7', 'canon r7')).toBe(true);
    expect(matchesFuzzyTokens('Canon EOS R6', 'canon r7')).toBe(false);
  });
});
