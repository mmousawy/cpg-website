import { describe, expect, it } from 'vitest';

import {
  isLearnInteractiveId,
  learnInteractiveIds,
  learnInteractives,
} from './registry';

describe('learn interactives registry', () => {
  it('maps every id to a component', () => {
    for (const id of learnInteractiveIds) {
      expect(isLearnInteractiveId(id)).toBe(true);
      expect(learnInteractives[id]).toBeDefined();
    }
  });

  it('rejects unknown ids', () => {
    expect(isLearnInteractiveId('not-real')).toBe(false);
  });
});
