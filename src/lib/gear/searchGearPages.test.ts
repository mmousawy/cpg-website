import { describe, expect, it } from 'vitest';

import type { GroupedMemberGear } from '@/lib/gear/groupMembersByGear';
import { searchGearPages } from './searchGearPages';

const member = {
  id: '1',
  full_name: 'A',
  nickname: 'a',
  avatar_url: null,
};

function grouped(partial: Partial<GroupedMemberGear>): GroupedMemberGear {
  return {
    byFormat: partial.byFormat ?? [],
    byCamera: partial.byCamera ?? [],
    byLens: partial.byLens ?? [],
  };
}

describe('searchGearPages', () => {
  it('matches label prefix and alias substrings', () => {
    const results = searchGearPages(
      grouped({
        byCamera: [
          { key: 'fujifilmxt5', label: 'Fujifilm X-T5', members: [member, member] },
        ],
        byLens: [
          { key: 'xf35', label: 'XF 35mm F1.4', members: [member] },
        ],
      }),
      'xt5',
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Fujifilm X-T5');
    expect(results[0]?.entity_type).toBe('gear');
    expect(results[0]?.entity_id).toBe('camera:fujifilmxt5');
    expect(results[0]?.url).toBe('/members/camera/Fujifilm%20X-T5');
  });

  it('includes shooting format pages and caps results', () => {
    const results = searchGearPages(
      grouped({
        byFormat: [
          { key: 'digital', label: 'Digital camera', members: [member, member, member] },
          { key: 'phone', label: 'Phone', members: [member] },
        ],
        byCamera: Array.from({ length: 10 }, (_, i) => ({
          key: `cam${i}`,
          label: `Canon Test ${i}`,
          members: [member],
        })),
      }),
      'dig',
      3,
    );

    expect(results.length).toBeLessThanOrEqual(3);
    expect(results.some((r) => r.entity_id === 'format:digital')).toBe(true);
  });
});
