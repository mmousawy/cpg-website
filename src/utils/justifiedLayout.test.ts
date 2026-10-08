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
});
