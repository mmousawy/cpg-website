import { describe, expect, it } from 'vitest';

import { calculateJustifiedLayout } from '@/utils/justifiedLayout';

function landscapes(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index),
    url: '/photo.jpg',
    width: 1500,
    height: 1000,
  }));
}

describe('calculateJustifiedLayout', () => {
  it('keeps at least minPhotosPerRow on every row except the last', () => {
    const rows = calculateJustifiedLayout(landscapes(10), 400, {
      minPhotosPerRow: 2,
      maxPhotosPerRow: 3,
      targetRowHeight: 180,
      maxRowHeight: 350,
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].items.length).toBeGreaterThanOrEqual(2);
    for (const row of rows.slice(0, -1)) {
      expect(row.items.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('still allows a single photo when that is the whole set', () => {
    const rows = calculateJustifiedLayout(landscapes(1), 400, {
      minPhotosPerRow: 2,
      maxPhotosPerRow: 3,
      targetRowHeight: 180,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].items).toHaveLength(1);
  });

  it('splits five landscapes into two rows instead of one short strip', () => {
    const rows = calculateJustifiedLayout(landscapes(5), 960, {
      minPhotosPerRow: 2,
      maxPhotosPerRow: 5,
      targetRowHeight: 280,
      maxRowHeight: 350,
      gap: 8,
    });

    expect(rows.length).toBe(2);
    expect(rows.every((row) => row.items.length >= 2)).toBe(true);
    expect(rows.reduce((sum, row) => sum + row.items.length, 0)).toBe(5);
  });
});
