import { describe, expect, it } from 'vitest';

import {
  rankAndLimitGearSearchResults,
  rankGearSearchResult,
} from './searchCatalog';
import type { GearCategory } from './types';

const cameraBody = 'camera_body' as GearCategory;

describe('searchCatalog ranking', () => {
  it('prefers exact and prefix matches over alphabetical neighbors', () => {
    expect(rankGearSearchResult('Nikon FE', 'Nikon FE')).toBeGreaterThan(
      rankGearSearchResult('Nikon FE2', 'Nikon FE'),
    );
    expect(rankGearSearchResult('Nikon FE', 'Nikon F')).toBeGreaterThan(
      rankGearSearchResult('Nikon FG-20', 'Nikon F'),
    );
  });

  it('prefers shorter names when query is a single brand token', () => {
    expect(rankGearSearchResult('Nikon FE', 'Nikon')).toBeGreaterThan(
      rankGearSearchResult('Nikon 1 AW1', 'Nikon'),
    );
  });

  it('ranks Nikon FE ahead of longer F-series names for Nikon F', () => {
    const candidates = [
      { id: '1', brand: 'Nikon', name: 'Nikon F', category: cameraBody },
      { id: '2', brand: 'Nikon', name: 'Nikon FE', category: cameraBody },
      { id: '3', brand: 'Nikon', name: 'Nikon FG-20', category: cameraBody },
    ];
    const results = rankAndLimitGearSearchResults(candidates, 'Nikon F', 3);
    expect(results.map((row) => row.name)).toEqual(['Nikon F', 'Nikon FE', 'Nikon FG-20']);
  });
});
