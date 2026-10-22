import { describe, expect, it } from 'vitest';

import { planPhotoTagSync } from './photoTagSync';

describe('planPhotoTagSync', () => {
  it('replaces all tags on each photo', () => {
    const plan = planPhotoTagSync(
      [
        { photo_id: 'a', tag: 'old' },
        { photo_id: 'a', tag: 'keep' },
      ],
      {
        photoIds: ['a'],
        desiredTags: ['new'],
        mode: 'replace',
      },
    );

    expect(plan.deletes).toEqual([
      { photo_id: 'a', tag: 'old' },
      { photo_id: 'a', tag: 'keep' },
    ]);
    expect(plan.inserts).toEqual([{ photo_id: 'a', tag: 'new' }]);
  });

  it('merges bulk tags without removing partial tags', () => {
    const plan = planPhotoTagSync(
      [
        { photo_id: 'a', tag: 'street' },
        { photo_id: 'a', tag: 'night' },
      ],
      {
        photoIds: ['a'],
        desiredTags: ['street'],
        originalCommonTags: ['street', 'night'],
        mode: 'merge',
      },
    );

    expect(plan.deletes).toEqual([{ photo_id: 'a', tag: 'night' }]);
    expect(plan.inserts).toEqual([]);
  });
});
