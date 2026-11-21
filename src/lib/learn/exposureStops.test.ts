import { describe, expect, it } from 'vitest';

import { exposureStops } from './exposureStops';

describe('exposureStops', () => {
  it('increases when shutter slows (more light)', () => {
    const fast = exposureStops(4, 1 / 4000, 100);
    const slow = exposureStops(4, 1, 100);
    expect(slow).toBeGreaterThan(fast);
  });

  it('decreases when aperture narrows', () => {
    const wide = exposureStops(2.8, 1 / 125, 100);
    const narrow = exposureStops(11, 1 / 125, 100);
    expect(wide).toBeGreaterThan(narrow);
  });

  it('increases with ISO', () => {
    const low = exposureStops(4, 1 / 125, 100);
    const high = exposureStops(4, 1 / 125, 1600);
    expect(high).toBeGreaterThan(low);
  });
});
