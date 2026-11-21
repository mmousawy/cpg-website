import { describe, expect, it } from 'vitest';

import {
  exposureBaselineHint,
  exposureBrightnessMultiplier,
  focusExposureCorrection,
  exposureClipOverlays,
  LEARN_EXPOSURE_REFERENCE_STOPS,
  sunDiskForExposure,
  sunHighlightStrength,
} from './exposureScene';
import { exposureStops } from './exposureStops';

describe('exposureScene', () => {
  it('is 1× at the reference triangle settings', () => {
    expect(exposureBrightnessMultiplier(LEARN_EXPOSURE_REFERENCE_STOPS)).toBe(1);
  });

  it('is neutral at the default f/2.8, 1/1000, ISO 200', () => {
    const ref = LEARN_EXPOSURE_REFERENCE_STOPS;
    expect(exposureStops(2.8, 1 / 1000, 200) - ref).toBeCloseTo(0, 5);
  });

  it('keeps f/8, 1/500, ISO 800–1600 near the same stop budget', () => {
    const ref = LEARN_EXPOSURE_REFERENCE_STOPS;
    const delta800 = exposureStops(8, 1 / 500, 800) - ref;
    expect(Math.abs(delta800)).toBeLessThan(0.6);
    const delta1600 = exposureStops(8, 1 / 500, 1600) - ref;
    expect(Math.abs(delta1600)).toBeLessThan(1.1);
  });

  it('blows the sun nearly white at f/5.6 on the neutral shutter and ISO', () => {
    const atF56 = exposureBrightnessMultiplier(exposureStops(5.6, 1 / 1000, 200));
    expect(sunHighlightStrength(atF56)).toBeCloseTo(0.9, 2);
    expect(sunHighlightStrength(1)).toBe(1);
    expect(sunHighlightStrength(atF56 * 0.5)).toBeLessThan(0.5);
  });

  it('fades the sun disk gradually across darker exposures', () => {
    const bright = sunDiskForExposure(1);
    const dim = sunDiskForExposure(0.45);
    const darker = sunDiskForExposure(0.2);
    const nearlyBlack = sunDiskForExposure(0.02);
    expect(bright.opacity).toBeCloseTo(1, 5);
    expect(dim.opacity).toBeGreaterThan(darker.opacity);
    expect(darker.opacity).toBeGreaterThan(nearlyBlack.opacity);
    expect(dim.opacity).toBeGreaterThan(0.55);
    expect(nearlyBlack.opacity).toBeGreaterThan(0.05);
    expect(nearlyBlack.opacity).toBeLessThan(0.35);
    expect(sunDiskForExposure(0.4, 1).opacity).toBeCloseTo(0, 5);
    expect(dim.color).not.toBe(bright.color);
  });

  it('starts highlight clipping within a couple of slider steps of neutral', () => {
    expect(exposureClipOverlays(LEARN_EXPOSURE_REFERENCE_STOPS).white).toBe(0);

    const slowerShutter = exposureStops(2.8, 1 / 125, 200);
    expect(exposureClipOverlays(slowerShutter).white).toBeGreaterThan(0.2);

    const corner = exposureStops(16, 1, 6400);
    expect(exposureClipOverlays(corner).white).toBe(1);
  });

  it('uses aperture and ISO to get near a neutral baseline', () => {
    const stops = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16];
    const isos = [100, 200, 400, 800, 1600, 3200, 6400];
    const neutral = focusExposureCorrection(1 / 1000, stops, isos);
    expect(neutral.reachable).toBe(true);
    expect(Math.abs(neutral.delta)).toBeLessThan(0.55);

    const wideOpen = focusExposureCorrection(1 / 1000, [1.4], isos);
    expect(wideOpen.reachable).toBe(true);

    const tooBright = focusExposureCorrection(1, stops, isos);
    expect(tooBright.reachable).toBe(false);
  });

  it('is pitch black at the darkest settings, and a couple of stops earlier', () => {
    expect(exposureClipOverlays(exposureStops(16, 1 / 4000, 100)).black).toBe(1);
    expect(exposureClipOverlays(exposureStops(16, 1 / 1000, 100)).black).toBe(1);
  });

  it('labels brighter and darker from the same distance off neutral', () => {
    const hint = (f: number, shutter: number, iso: number) => {
      const delta = exposureStops(f, shutter, iso) - LEARN_EXPOSURE_REFERENCE_STOPS;
      const clips = exposureClipOverlays(exposureStops(f, shutter, iso));
      return exposureBaselineHint(delta, clips.white, clips.black);
    };

    expect(hint(2.8, 1 / 1000, 200)).toBe('Near a neutral baseline');
    expect(hint(2.8, 1 / 1000, 400)).toBe('Brighter than a neutral baseline');
    expect(hint(2.8, 1 / 1000, 100)).toBe('Darker than a neutral baseline');
    expect(hint(2.8, 1 / 250, 200)).toContain('Brighter than a neutral baseline');
    expect(hint(2.8, 1 / 4000, 200)).toContain('Darker than a neutral baseline');
    expect(hint(2.8, 1 / 125, 200)).toMatch(/highlights clipping|blown highlights/);
    expect(exposureClipOverlays(exposureStops(2.8, 1 / 1000, 6400)).white).toBe(1);
    expect(hint(16, 1 / 1000, 100)).toMatch(/shadows clipping|Clipped to black/);
  });

  it('does not crush the frame to black a couple of steps under neutral', () => {
    const twoStepsDarker = exposureStops(2.8, 1 / 4000, 200);
    expect(exposureClipOverlays(twoStepsDarker).black).toBeLessThan(0.55);
  });
});
