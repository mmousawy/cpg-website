import { describe, expect, it } from 'vitest';

import { generateHelpSearchIndex } from './generate-help-search-index';

describe('generate-help-search-index (write)', () => {
  it('writes helpSearchIndex.generated.ts', () => {
    const count = generateHelpSearchIndex();
    expect(count).toBeGreaterThan(0);
  });
});
