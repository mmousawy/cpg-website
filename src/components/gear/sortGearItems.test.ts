import { describe, expect, it } from 'vitest';

import { sortGearItems } from './sortGearItems';
import type { UserGearItem } from '@/lib/gear/types';

const item = (id: string, name: string): UserGearItem => ({
  id,
  catalogId: null,
  name,
  category: 'lens',
  note: '',
  addedAt: 0,
});

describe('sortGearItems', () => {
  it('preserves array order in custom mode', () => {
    const items = [item('b', 'B'), item('a', 'A')];
    expect(sortGearItems(items, 'custom').map((i) => i.id)).toEqual(['b', 'a']);
  });
});
