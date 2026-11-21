import { describe, expect, it } from 'vitest';

import {
  apertureDiffractionBlurStd,
  apertureEvenFocusDepth,
  apertureFocusSeparationStrength,
  apertureVignetteOpacity,
  LEARN_OPTIMAL_APERTURE_INDEX,
  LEARN_VIGNETTE_CLEAR_APERTURE_INDEX,
} from './apertureFocus';

describe('apertureFocus', () => {
  it('has no separation blur at f/8 and beyond', () => {
    expect(apertureFocusSeparationStrength(LEARN_OPTIMAL_APERTURE_INDEX)).toBe(0);
    expect(apertureFocusSeparationStrength(7)).toBe(0);
    expect(apertureEvenFocusDepth(LEARN_OPTIMAL_APERTURE_INDEX)).toBe(1);
  });

  it('ramps separation for apertures wider than f/8', () => {
    expect(apertureFocusSeparationStrength(0)).toBe(1);
    expect(apertureFocusSeparationStrength(4)).toBeGreaterThan(0);
    expect(apertureFocusSeparationStrength(4)).toBeLessThan(1);
  });

  it('adds diffraction blur only past f/8', () => {
    expect(apertureDiffractionBlurStd(LEARN_OPTIMAL_APERTURE_INDEX)).toBe(0);
    expect(apertureDiffractionBlurStd(0)).toBe(0);
    expect(apertureDiffractionBlurStd(7)).toBeGreaterThan(apertureDiffractionBlurStd(6));
    expect(apertureDiffractionBlurStd(7)).toBeCloseTo(1.2);
  });

  it('vignettes widest at f/1.4 and clears by f/5.6', () => {
    expect(apertureVignetteOpacity(0)).toBe(1);
    expect(apertureVignetteOpacity(2)).toBeCloseTo(0.5);
    expect(apertureVignetteOpacity(LEARN_VIGNETTE_CLEAR_APERTURE_INDEX)).toBe(0);
    expect(apertureVignetteOpacity(LEARN_OPTIMAL_APERTURE_INDEX)).toBe(0);
  });
});
