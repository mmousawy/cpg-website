import { describe, expect, it } from 'vitest';

import { CURATED_GEAR } from '@/lib/gear/curatedPhones';
import { formatCatalogDisplayName } from '@/lib/gear/formatCatalogDisplayName';

describe('formatCatalogDisplayName', () => {
  it('prefixes curated film stock with brand', () => {
    const film = CURATED_GEAR.filter((e) => e.category === 'film');
    expect(film.map((e) => formatCatalogDisplayName(e.brand, e.name))).toEqual([
      'Kodak Portra 400',
      'Kodak Gold 200',
      'Ilford HP5 Plus',
    ]);
  });

  it('does not duplicate brand when already in name', () => {
    expect(formatCatalogDisplayName('Kodak', 'Kodak Portra 400')).toBe('Kodak Portra 400');
    expect(formatCatalogDisplayName('Sony Group', 'Sony Cyber-shot DSC-W30')).toBe(
      'Sony Cyber-shot DSC-W30',
    );
  });
});
