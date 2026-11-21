export const LEARN_HISTOGRAM_BINS = 48;

const BELL_CENTER = 0.5;
/** Wide enough that a neutral exposure still has tails at both ends of the histogram. */
const BELL_SIGMA = 0.23;

/**
 * Neutral scene histogram: a bell, with a sine wobble and a second slower wave.
 * `t` is scene luminance before exposure (0–1).
 */
export function histogramNeutralShape(t: number, isoSpread = 0): number {
  if (t <= 0 || t >= 1) {
    return 0;
  }

  const z = (t - BELL_CENTER) / BELL_SIGMA;
  const bell = Math.exp(-0.5 * z * z);
  const sine = 0.18 * Math.sin(t * Math.PI * 6);
  const grit = (0.08 + isoSpread * 0.15) * Math.sin(t * Math.PI * 14) * Math.cos(t * Math.PI * 3);

  return Math.max(0, bell * (1 + sine + grit));
}

/**
 * Luminance histogram for the learn preview.
 * Brightness multiplies the x position of the neutral curve, so the bell slides
 * right when brighter and left when darker. Bar height is not scaled by exposure.
 */
export function exposureHistogramBins(
  brightnessMultiplier: number,
  clipWhite: number,
  clipBlack: number,
  isoSpread = 0,
): number[] {
  const n = LEARN_HISTOGRAM_BINS;
  const gain = brightnessMultiplier > 0 ? brightnessMultiplier : 0.01;
  const raw = new Array<number>(n).fill(0);

  let neutralPeak = 0.0001;
  for (let i = 0; i < n; i += 1) {
    neutralPeak = Math.max(neutralPeak, histogramNeutralShape((i + 0.5) / n, isoSpread));
  }

  if (gain >= 1) {
    // Slide the whole bell right. Anything pushed past white stacks on the last bin.
    const shift = 1 - 1 / gain;
    for (let i = 0; i < n; i += 1) {
      const source = (i + 0.5) / n - shift;
      raw[i] = histogramNeutralShape(source, isoSpread) / neutralPeak;
    }
    let clipped = 0;
    const clipSteps = 64;
    const start = Math.max(0, 1 - shift);
    for (let s = 0; s < clipSteps; s += 1) {
      const t = start + ((1 - start) * (s + 0.5)) / clipSteps;
      clipped += histogramNeutralShape(t, isoSpread) / neutralPeak;
    }
    const clipShare = (clipped / clipSteps) * (1 - start) * n;
    raw[n - 1] = Math.min(1, (raw[n - 1] ?? 0) + clipShare * 0.2);
  } else {
    const steps = n * 6;
    for (let s = 0; s < steps; s += 1) {
      const t = (s + 0.5) / steps;
      const weight = histogramNeutralShape(t, isoSpread) / neutralPeak;
      const exposed = t * gain;
      if (exposed <= 0) {
        raw[0] += weight;
      } else {
        const idx = Math.min(n - 1, Math.max(0, Math.floor(exposed * n)));
        raw[idx] += weight;
      }
    }
    const samplesPerBin = steps / n;
    for (let i = 0; i < n; i += 1) {
      raw[i] = (raw[i] ?? 0) / samplesPerBin;
    }
    const bodyMax = Math.max(...raw.slice(1, -1), 0.0001);
    if (bodyMax > 1) {
      for (let i = 1; i < n - 1; i += 1) {
        raw[i] = (raw[i] ?? 0) / bodyMax;
      }
    }
  }

  if (clipWhite > 0.05) {
    raw[n - 1] = (raw[n - 1] ?? 0) + clipWhite * 0.7;
  }
  if (clipBlack > 0.05) {
    raw[0] = (raw[0] ?? 0) + clipBlack * 0.7;
  }

  return raw.map((value) => Math.min(1, Math.max(0, value)));
}
