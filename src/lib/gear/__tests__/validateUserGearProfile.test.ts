import { describe, expect, it } from 'vitest';

import { parseUserGearProfileBody } from '@/lib/gear/validateUserGearProfile';

const itemId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('parseUserGearProfileBody', () => {
  it('accepts a minimal valid profile', () => {
    const result = parseUserGearProfileBody({
      formats: ['digital'],
      formatsOther: '',
      dailyDriverBody: 'Canon R5',
      dailyDriverBodyCatalogId: null,
      dailyDriverLens: '',
      dailyDriverLensCatalogId: null,
      items: [{
        id: itemId,
        catalogId: null,
        name: 'Canon EOS R5',
        category: 'camera_body',
        note: '',
        addedAt: 1_700_000_000_000,
      }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.formats).toEqual(['digital']);
      expect(result.profile.items).toHaveLength(1);
    }
  });

  it('rejects invalid category', () => {
    const result = parseUserGearProfileBody({
      formats: [],
      formatsOther: '',
      dailyDriverBody: '',
      dailyDriverBodyCatalogId: null,
      dailyDriverLens: '',
      dailyDriverLensCatalogId: null,
      items: [{
        id: itemId,
        catalogId: null,
        name: 'Thing',
        category: 'drone',
        note: '',
        addedAt: 1,
      }],
    });

    expect(result.ok).toBe(false);
  });
});
