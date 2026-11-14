import { describe, expect, it } from 'vitest';

import { helpSearchEntries } from '../src/lib/help/helpSearchIndex.generated';

import { buildHelpSearchEntries } from './generate-help-search-index';

describe('helpSearchIndex.generated.ts', () => {
  it('matches help FAQ content (run pnpm help:search-index after editing help)', () => {
    expect(buildHelpSearchEntries()).toEqual(helpSearchEntries);
  });
});
