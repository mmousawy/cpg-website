import { describe, expect, it } from 'vitest';

import {
  gearItemIdentityKey,
  normalizeGearItemsList,
  prepareGearItemForInventory,
  resolveGearLabelCasing,
  upsertGearInventoryItem,
} from './canonicalGearItem';
import type { UserGearItem } from './types';

const baseItem = (overrides: Partial<UserGearItem>): UserGearItem => ({
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  catalogId: null,
  name: 'Nikon FE',
  category: 'camera_body',
  note: '',
  addedAt: 1,
  ...overrides,
});

describe('canonicalGearItem', () => {
  it('uses catalog label casing when provided', () => {
    expect(
      resolveGearLabelCasing({
        text: 'nikon fe',
        category: 'camera_body',
        catalogId: 'cat-1',
        catalogLabel: 'Nikon FE',
      }),
    ).toEqual({ name: 'Nikon FE', catalogId: 'cat-1' });
  });

  it('reuses peer item casing in the same category', () => {
    const existing = [baseItem({ name: 'Nikon FE' })];
    expect(
      resolveGearLabelCasing({
        text: 'nikon fe',
        category: 'camera_body',
        catalogId: null,
        peerItems: existing,
      }),
    ).toEqual({ name: 'Nikon FE', catalogId: null });
  });

  it('drops duplicate inventory rows that only differ by casing', () => {
    const items = [
      baseItem({ id: '1', name: 'Nikon FE' }),
      baseItem({ id: '2', name: 'nikon fe' }),
    ];
    const normalized = normalizeGearItemsList(items, new Map());
    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.name).toBe('Nikon FE');
  });

  it('merges a new add into an existing row with the same spelling', () => {
    const existing = [baseItem({ id: 'keep-me', name: 'Nikon FE', note: 'main' })];
    const added = prepareGearItemForInventory(
      baseItem({ id: 'new-id', name: 'nikon fe', note: 'spare' }),
      existing,
    );
    expect(added.id).toBe('keep-me');
    expect(added.name).toBe('Nikon FE');
  });

  it('prefers catalog label when merging into an existing row', () => {
    const existing = [baseItem({ id: 'keep-me', name: 'nikon fe', note: 'main' })];
    const added = prepareGearItemForInventory(
      baseItem({ id: 'new-id', name: 'NIKON FE', note: 'spare' }),
      existing,
      'Nikon FE',
    );
    expect(added.name).toBe('Nikon FE');
  });

  it('does not leave two rows when edit renames onto an existing item', () => {
    const items = [
      baseItem({ id: 'edit-me', name: 'Nikon FM', note: 'fm' }),
      baseItem({ id: 'keep-me', name: 'Nikon FE', note: 'fe' }),
    ];
    const prepared = prepareGearItemForInventory(
      baseItem({ id: 'edit-me', name: 'nikon fe', note: 'updated' }),
      items,
      'Nikon FE',
    );
    const next = upsertGearInventoryItem(items, prepared, 'edit-me');
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe('keep-me');
    expect(next[0]?.name).toBe('Nikon FE');
    expect(next[0]?.note).toBe('updated');
  });

  it('does not treat different categories as the same item', () => {
    expect(gearItemIdentityKey('camera_body', '50mm')).not.toBe(
      gearItemIdentityKey('lens', '50mm'),
    );
  });
});
