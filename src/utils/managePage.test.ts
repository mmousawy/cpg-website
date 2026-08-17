import { describe, expect, it } from 'vitest';

import { isManagePagePath } from '@/utils/managePage';

describe('isManagePagePath', () => {
  it('matches photos and albums manage routes', () => {
    expect(isManagePagePath('/account/photos')).toBe(true);
    expect(isManagePagePath('/account/albums')).toBe(true);
    expect(isManagePagePath('/account/albums/summer-walk')).toBe(true);
  });

  it('does not match other account or public routes', () => {
    expect(isManagePagePath('/account')).toBe(false);
    expect(isManagePagePath('/account/events')).toBe(false);
    expect(isManagePagePath('/gallery')).toBe(false);
    expect(isManagePagePath('/account/photos-archive')).toBe(false);
  });
});
