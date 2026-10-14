import { describe, expect, it } from 'vitest';

import {
  isAcceptableCameraWikiPageTitle,
  isSkippableCameraWikiCategory,
  splitCameraWikiBrand,
} from './camerawikiCatalog';

describe('camerawikiCatalog', () => {
  it('skips non-model category branches', () => {
    expect(isSkippableCameraWikiCategory('Category:Camera makers')).toBe(true);
    expect(isSkippableCameraWikiCategory('Category:Japanese 35mm SLR')).toBe(false);
  });

  it('rejects overview page titles', () => {
    expect(isAcceptableCameraWikiPageTitle('List of Nikon cameras')).toBe(false);
    expect(isAcceptableCameraWikiPageTitle('Nikon FE')).toBe(true);
  });

  it('splits brand from page title', () => {
    expect(splitCameraWikiBrand('Nikon FE')).toEqual({ brand: 'Nikon', name: 'Nikon FE' });
    expect(splitCameraWikiBrand('Bell & Howell FD35')).toEqual({
      brand: 'Bell & Howell',
      name: 'Bell & Howell FD35',
    });
    expect(splitCameraWikiBrand('Canon AE-1')).toEqual({ brand: 'Canon', name: 'Canon AE-1' });
  });
});
