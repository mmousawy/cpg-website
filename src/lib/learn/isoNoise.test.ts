import { describe, expect, it } from 'vitest';

import {
  isoNoiseGrainLayer,
  isoNoiseOverlayOpacity,
  LEARN_ISO_NOISE_FLOOR_OPACITY,
  LEARN_ISO_NOISE_MAX_OPACITY,
} from './isoNoise';

describe('isoNoiseGrainLayer', () => {
  it('is subtle at base ISO', () => {
    const at100 = isoNoiseGrainLayer(100);
    expect(at100.opacity).toBeCloseTo(LEARN_ISO_NOISE_FLOOR_OPACITY, 5);
    expect(at100.opacity).toBeLessThan(0.12);
    expect(at100.chromaStrength).toBe(0);
  });

  it('peaks near max opacity at highest ISO', () => {
    const at6400 = isoNoiseGrainLayer(6400);
    expect(at6400.opacity).toBeCloseTo(LEARN_ISO_NOISE_MAX_OPACITY, 2);
    expect(at6400.brightness).toBeGreaterThan(1.05);
    expect(at6400.brightness).toBeLessThan(1.25);
    expect(at6400.chromaStrength).toBeGreaterThan(0.95);
    expect(at6400.saturate).toBeGreaterThan(3);
  });

  it('increases monotonically with ISO', () => {
    const isos = [100, 200, 400, 800, 1600, 3200, 6400];
    const layers = isos.map((iso) => isoNoiseGrainLayer(iso));
    for (let i = 1; i < layers.length; i += 1) {
      expect(layers[i]!.opacity).toBeGreaterThanOrEqual(layers[i - 1]!.opacity);
      expect(layers[i]!.brightness).toBeGreaterThanOrEqual(layers[i - 1]!.brightness);
      expect(layers[i]!.chromaStrength).toBeGreaterThanOrEqual(layers[i - 1]!.chromaStrength);
    }
  });
});

describe('isoNoiseOverlayOpacity', () => {
  it('matches grain layer opacity', () => {
    expect(isoNoiseOverlayOpacity(400)).toBe(isoNoiseGrainLayer(400).opacity);
  });
});
