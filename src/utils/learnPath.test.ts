import { describe, expect, it } from 'vitest';

import { isLearnDeckPath, isLearnCatalogPath, isLearnPagePath } from './learnPath';

describe('learnPath', () => {
  it('detects catalog vs deck paths', () => {
    expect(isLearnCatalogPath('/learn')).toBe(true);
    expect(isLearnCatalogPath('/learn/exposure')).toBe(false);

    expect(isLearnDeckPath('/learn/exposure')).toBe(true);
    expect(isLearnDeckPath('/learn')).toBe(false);
    expect(isLearnDeckPath('/learn/')).toBe(false);

    expect(isLearnPagePath('/learn')).toBe(true);
    expect(isLearnPagePath('/learn/exposure')).toBe(true);
    expect(isLearnPagePath('/events')).toBe(false);
  });
});
