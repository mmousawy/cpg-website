import { describe, expect, it } from 'vitest';

import { EMPTY_GEAR_PROFILE } from './types';
import { buildGearCollectionJsonLd } from './jsonLd';

describe('buildGearCollectionJsonLd', () => {
  it('lists kit names and optional catalog brands', () => {
    const jsonLd = buildGearCollectionJsonLd({
      name: "Ada's gear list",
      url: 'https://example.com/@ada/gear',
      creatorNickname: 'ada',
      creatorName: 'Ada',
      profile: {
        ...EMPTY_GEAR_PROFILE,
        dailyDriverBody: 'Nikon F3',
        dailyDriverBodyCatalogId: 'body-1',
        items: [
          {
            id: 'item-1',
            catalogId: 'lens-1',
            name: 'Nikkor 50mm f/1.4',
            category: 'lens',
            note: '',
            addedAt: 0,
          },
        ],
      },
      brandsByCatalogId: {
        'body-1': 'Nikon',
        'lens-1': 'Nikon',
      },
    });

    expect(jsonLd.mainEntity).toMatchObject({
      '@type': 'ItemList',
      numberOfItems: 2,
    });
    expect(jsonLd.mainEntity?.itemListElement[0].item).toMatchObject({
      name: 'Nikon F3',
      brand: { '@type': 'Brand', name: 'Nikon' },
    });
    expect(jsonLd.author).toMatchObject({
      '@type': 'Person',
      '@id': expect.stringContaining('/@ada#person'),
    });
  });
});
