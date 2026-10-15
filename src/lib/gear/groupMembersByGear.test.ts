import { describe, expect, it } from 'vitest';

import {
  groupMembersByGear,
  type MemberGearDiscoveryRow,
} from './groupMembersByGear';

const member = (
  id: string,
  overrides: Partial<MemberGearDiscoveryRow> = {},
): MemberGearDiscoveryRow => ({
  id,
  full_name: `User ${id}`,
  nickname: `user${id}`,
  avatar_url: null,
  formats: [],
  formats_other: '',
  daily_driver_body: '',
  daily_driver_body_catalog_id: null,
  daily_driver_lens: '',
  daily_driver_lens_catalog_id: null,
  ...overrides,
});

describe('groupMembersByGear', () => {
  const catalogNames = new Map<string, string>([
    ['cat-xt5', 'Fujifilm X-T5'],
  ]);

  it('places a member in every selected shooting format', () => {
    const grouped = groupMembersByGear(
      [
        member('1', { formats: ['digital', 'analog'] }),
      ],
      catalogNames,
    );

    expect(grouped.byFormat.map((g) => g.key).sort()).toEqual(['analog', 'digital']);
    expect(grouped.byFormat.every((g) => g.members.length === 1)).toBe(true);
  });

  it('keeps other as a single bucket regardless of formats_other', () => {
    const grouped = groupMembersByGear(
      [
        member('1', { formats: ['other'], formats_other: 'Pinhole' }),
        member('2', { formats: ['other'], formats_other: 'Wet plate' }),
      ],
      catalogNames,
    );

    expect(grouped.byFormat).toHaveLength(1);
    expect(grouped.byFormat[0].key).toBe('other');
    expect(grouped.byFormat[0].members).toHaveLength(2);
  });

  it('ignores blank daily drivers', () => {
    const grouped = groupMembersByGear(
      [member('1', { daily_driver_body: '   ', daily_driver_lens: '' })],
      catalogNames,
    );

    expect(grouped.byCamera).toHaveLength(0);
    expect(grouped.byLens).toHaveLength(0);
  });

  it('merges free-text and catalog names via alias key and prefers catalog label', () => {
    const grouped = groupMembersByGear(
      [
        member('1', {
          daily_driver_body: 'fujifilm x-t5',
          daily_driver_body_catalog_id: null,
        }),
        member('2', {
          daily_driver_body: 'X-T5',
          daily_driver_body_catalog_id: 'cat-xt5',
        }),
      ],
      catalogNames,
    );

    expect(grouped.byCamera).toHaveLength(1);
    expect(grouped.byCamera[0].label).toBe('Fujifilm X-T5');
    expect(grouped.byCamera[0].members).toHaveLength(2);
  });

  it('groups lenses separately from camera bodies', () => {
    const grouped = groupMembersByGear(
      [
        member('1', {
          daily_driver_body: 'Canon EOS R5',
          daily_driver_lens: 'RF 50mm f/1.8',
        }),
      ],
      catalogNames,
    );

    expect(grouped.byCamera).toHaveLength(1);
    expect(grouped.byLens).toHaveLength(1);
    expect(grouped.byCamera[0].label).toBe('Canon EOS R5');
    expect(grouped.byLens[0].label).toBe('RF 50mm f/1.8');
  });
});
