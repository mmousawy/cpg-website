import { describe, expect, it } from 'vitest';

import { EXPOSURE_SAMPLE_BINS, exposureHintFromPixels, measureExposurePixels, type ExposureLayerStack } from './exposurePixels';

function fill(rgba: number[], count: number) {
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i += 1) {
    data[i * 4] = rgba[0]!;
    data[i * 4 + 1] = rgba[1]!;
    data[i * 4 + 2] = rgba[2]!;
    data[i * 4 + 3] = 255;
  }
  return data;
}

function layers(overrides: Partial<ExposureLayerStack> = {}): ExposureLayerStack {
  return {
    brightness: 1,
    clipWhite: 0,
    clipBlack: 0,
    vignetteOpacity: 0,
    sunGlowOpacity: 0,
    sunColor: '#ffe4a8',
    sunDiskColor: '#fffdf8',
    sunDiskOpacity: 0,
    ...overrides,
  };
}

describe('exposure pixels', () => {
  const scene = fill([53, 78, 63], 80);

  it('reads a higher average when the same pixels are brightened', () => {
    const neutral = measureExposurePixels(scene, 10, 8, layers());
    const hot = measureExposurePixels(scene, 10, 8, layers({ brightness: 3 }));
    expect(hot.average).toBeGreaterThan(neutral.average + 0.25);
    expect(hot.highlightClip).toBeGreaterThanOrEqual(neutral.highlightClip);
  });

  it('calls a 3× bright frame blown compared with neutral', () => {
    const neutral = measureExposurePixels(scene, 10, 8, layers());
    const hot = measureExposurePixels(scene, 10, 8, layers({ brightness: 3 }));
    expect(exposureHintFromPixels(hot, neutral)).toBe('Clipped to white — blown highlights');
    expect(exposureHintFromPixels(neutral, neutral)).toBe('Near a neutral baseline');
  });

  it('calls a crushed frame lost shadow detail', () => {
    const neutral = measureExposurePixels(scene, 10, 8, layers());
    const dark = measureExposurePixels(scene, 10, 8, layers({ brightness: 0.15, clipBlack: 0.8 }));
    expect(exposureHintFromPixels(dark, neutral)).toMatch(/Darker than a neutral baseline|Clipped to black/);
  });

  it('counts the measured tones directly', () => {
    const sample = measureExposurePixels(scene, 10, 8, layers());
    expect(sample.bins).toHaveLength(EXPOSURE_SAMPLE_BINS);
    const occupied = sample.bins.filter((value) => value > 0);
    expect(occupied.length).toBe(1);
  });

  it('includes the sun disk and vignette in the average', () => {
    const plain = measureExposurePixels(scene, 10, 8, layers());
    const withSun = measureExposurePixels(
      scene,
      10,
      8,
      layers({ sunDiskColor: '#ffffff', sunDiskOpacity: 1, sunGlowOpacity: 0.4 }),
    );
    const withVignette = measureExposurePixels(scene, 10, 8, layers({ vignetteOpacity: 1 }));
    expect(withSun.average).toBeGreaterThan(plain.average);
    expect(withVignette.average).toBeLessThan(plain.average);
    expect(withVignette.bins).toEqual(plain.bins);
  });
});
