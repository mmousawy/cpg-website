import { describe, expect, it } from 'vitest';

import { exposureHistogramBins, LEARN_HISTOGRAM_BINS } from './exposureHistogram';

describe('exposureHistogramBins', () => {
  function centroid(bins: number[]) {
    const mass = bins.reduce((a, b) => a + b, 0);
    return bins.reduce((sum, value, index) => sum + index * value, 0) / mass;
  }

  function peakIndex(bins: number[]) {
    return bins.reduce((best, value, index) => (value > bins[best]! ? index : best), 0);
  }

  it('is a bell around the middle at neutral', () => {
    const bins = exposureHistogramBins(1, 0, 0);
    expect(bins).toHaveLength(LEARN_HISTOGRAM_BINS);
    expect(Math.max(...bins)).toBeGreaterThan(0.95);
    expect(peakIndex(bins)).toBeGreaterThan(16);
    expect(peakIndex(bins)).toBeLessThan(32);
    expect(bins[1]!).toBeGreaterThan(0.04);
    expect(bins[bins.length - 2]!).toBeGreaterThan(0.04);
    expect(bins[1]!).toBeLessThan(0.35);
    expect(bins[bins.length - 2]!).toBeLessThan(0.35);
  });

  it('slides the bell right when brighter without raising every bar', () => {
    const neutral = exposureHistogramBins(1, 0, 0);
    const warm = exposureHistogramBins(Math.pow(2, 0.55), 0, 0);
    expect(peakIndex(warm)).toBeGreaterThan(peakIndex(neutral) + 2);
    expect(centroid(warm)).toBeGreaterThan(centroid(neutral) + 2);
    expect(Math.max(...warm)).toBeCloseTo(1, 1);
    expect(warm[8]!).toBeLessThan(neutral[8]!);
    expect(warm[warm.length - 1]).toBeGreaterThan(neutral[neutral.length - 1]!);
  });

  it('slides the bell left when darker and stacks clipped shadows on the left', () => {
    const neutral = exposureHistogramBins(1, 0, 0);
    const dark = exposureHistogramBins(Math.pow(2, -0.55), 0, 0);
    expect(peakIndex(dark)).toBeLessThan(peakIndex(neutral) - 2);
    expect(centroid(dark)).toBeLessThan(centroid(neutral) - 2);
    expect(dark[1]!).toBeGreaterThan(neutral[1]!);
  });

  it('spikes the left when crushed to black', () => {
    const neutral = exposureHistogramBins(1, 0, 0);
    const crushed = exposureHistogramBins(0.35, 0, 0.85);
    expect(centroid(crushed)).toBeLessThan(centroid(neutral) - 3);
    expect(crushed[0]).toBeGreaterThan(0.5);
  });
});
