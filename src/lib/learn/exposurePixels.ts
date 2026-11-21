/** One bin per 8-bit intensity, same as a standard image histogram. */
export const EXPOSURE_SAMPLE_BINS = 256;

export type ExposurePixelSample = {
  bins: number[];
  average: number;
  highlightClip: number;
  shadowClip: number;
};

export type ExposureLayerStack = {
  brightness: number;
  clipWhite: number;
  clipBlack: number;
  vignetteOpacity: number;
  sunGlowOpacity: number;
  sunColor: string;
  sunDiskColor: string;
  sunDiskOpacity: number;
};

function parseHex(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function addLight(
  red: number,
  green: number,
  blue: number,
  color: [number, number, number],
  alpha: number,
): [number, number, number] {
  if (alpha <= 0) return [red, green, blue];
  return [
    Math.min(255, red + color[0] * alpha),
    Math.min(255, green + color[1] * alpha),
    Math.min(255, blue + color[2] * alpha),
  ];
}

/** Sun glow matches the on-screen ellipse: wide, horizontal, white core fading to the sun color. */
function sunGlowAlpha(nx: number, ny: number): { color: [number, number, number]; alpha: number } | null {
  const t = Math.hypot((nx - 0.65) / 0.68, (ny - 0.22) / 0.22);
  if (t >= 0.72) return null;
  if (t <= 0.05) return { color: [255, 255, 255], alpha: 1 };
  if (t <= 0.28) return { color: [255, 255, 255], alpha: 1 };
  return { color: [255, 255, 255], alpha: 1 - (t - 0.28) / 0.44 };
}

function sunGlowColor(nx: number, ny: number, sun: [number, number, number]): [number, number, number] {
  const t = Math.hypot((nx - 0.65) / 0.68, (ny - 0.22) / 0.22);
  if (t <= 0.05) return [255, 255, 255];
  if (t >= 0.28) return sun;
  const mix = (t - 0.05) / 0.23;
  return [
    255 + (sun[0] - 255) * mix,
    255 + (sun[1] - 255) * mix,
    255 + (sun[2] - 255) * mix,
  ];
}

/** Read a preview snapshot with the same stack as the screen. */
export function measureExposurePixels(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  layers: ExposureLayerStack,
  binCount = EXPOSURE_SAMPLE_BINS,
): ExposurePixelSample {
  const bins = new Array<number>(binCount).fill(0);
  const sun = parseHex(layers.sunColor);
  const disk = parseHex(layers.sunDiskColor);
  let sum = 0;
  let highlights = 0;
  let shadows = 0;
  let count = 0;
  const corner = Math.hypot(width / 2, height / 2);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (rgba[offset + 3]! < 12) continue;
      let red = rgba[offset]! * layers.brightness;
      let green = rgba[offset + 1]! * layers.brightness;
      let blue = rgba[offset + 2]! * layers.brightness;

      const nx = (x + 0.5) / width;
      const ny = (y + 0.5) / height;
      const glow = sunGlowAlpha(nx, ny);
      if (glow && layers.sunGlowOpacity > 0) {
        [red, green, blue] = addLight(red, green, blue, sunGlowColor(nx, ny, sun), glow.alpha * layers.sunGlowOpacity);
      }

      [red, green, blue] = addLight(red, green, blue, [255, 255, 255], layers.clipWhite);

      const shadow = 1 - layers.clipBlack;
      red *= shadow;
      green *= shadow;
      blue *= shadow;

      const diskT = Math.hypot((nx - 0.65) / 0.02, (ny - 0.22) / 0.032);
      if (diskT < 1.8 && layers.sunDiskOpacity > 0) {
        const diskAlpha = layers.sunDiskOpacity * Math.exp(-diskT * diskT * 1.4);
        [red, green, blue] = addLight(red, green, blue, disk, diskAlpha);
      }

      const histogramLuma = Math.min(255, Math.max(0, 0.299 * red + 0.587 * green + 0.114 * blue));
      const level = Math.round(histogramLuma);
      bins[Math.min(binCount - 1, Math.round((level / 255) * (binCount - 1)))]! += 1;

      const vignetteT = Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2) / corner;
      const vignetteAlpha = vignetteT <= 0.42 ? 0 : ((vignetteT - 0.42) / 0.58) * 0.38 * layers.vignetteOpacity;
      red *= 1 - vignetteAlpha;
      green *= 1 - vignetteAlpha;
      blue *= 1 - vignetteAlpha;

      const luma = Math.min(255, Math.max(0, 0.299 * red + 0.587 * green + 0.114 * blue));
      const unit = luma / 255;
      sum += unit;
      count += 1;
      if (Math.round(luma) === 255) highlights += 1;
      if (Math.round(luma) === 0) shadows += 1;
    }
  }

  const peak = Math.max(...bins, 1);
  return {
    bins: bins.map((value) => value / peak),
    average: count > 0 ? sum / count : 0,
    highlightClip: count > 0 ? highlights / count : 0,
    shadowClip: count > 0 ? shadows / count : 0,
  };
}

/** Label exposure from the snapshot average and how many pixels are actually clipped. */
export function exposureHintFromPixels(sample: ExposurePixelSample, baseline: ExposurePixelSample): string {
  const delta = sample.average - baseline.average;
  const highlightGain = sample.highlightClip - baseline.highlightClip;
  const shadowGain = sample.shadowClip - baseline.shadowClip;

  if (sample.highlightClip >= 0.22 || sample.average >= 0.72) {
    return 'Clipped to white — blown highlights';
  }
  if (sample.shadowClip >= 0.48 || sample.average <= 0.07) {
    return 'Clipped to black — lost shadow detail';
  }
  if (delta > 0.04 && highlightGain > 0.05) {
    return 'Brighter than a neutral baseline — highlights clipping';
  }
  if (delta < -0.04 && shadowGain > 0.06) {
    return 'Darker than a neutral baseline — shadows clipping';
  }
  if (delta > 0.03) return 'Brighter than a neutral baseline';
  if (delta < -0.03) return 'Darker than a neutral baseline';
  return 'Near a neutral baseline';
}
