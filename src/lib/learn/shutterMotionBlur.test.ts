import { describe, expect, it } from 'vitest';

import { SHARP_BIRDS_SHUTTER_SEC, shutterMotionBlurStdX } from './shutterMotionBlur';

describe('shutterMotionBlurStdX', () => {
  it('is sharp at 1/500 and faster', () => {
    expect(shutterMotionBlurStdX(SHARP_BIRDS_SHUTTER_SEC)).toBe(0);
    expect(shutterMotionBlurStdX(1 / 4000)).toBe(0);
    expect(shutterMotionBlurStdX(1 / 1000)).toBe(0);
  });

  it('is strong at slow shutter', () => {
    expect(shutterMotionBlurStdX(1)).toBeGreaterThan(30);
  });

  it('increases only below 1/500', () => {
    expect(shutterMotionBlurStdX(1 / 60)).toBeGreaterThan(shutterMotionBlurStdX(1 / 500));
    expect(shutterMotionBlurStdX(1 / 250)).toBeGreaterThan(0);
  });
});
