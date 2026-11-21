import { exposureStops } from './exposureStops';

/** Neutral exposure for the learn scene (default interactive sliders). */
export const LEARN_EXPOSURE_REFERENCE = {
  f: 2.8,
  shutterSec: 1 / 1000,
  iso: 200,
} as const;

export const LEARN_EXPOSURE_REFERENCE_STOPS = exposureStops(
  LEARN_EXPOSURE_REFERENCE.f,
  LEARN_EXPOSURE_REFERENCE.shutterSec,
  LEARN_EXPOSURE_REFERENCE.iso,
);

/** EV offset vs reference → linear brightness multiplier (1 = reference, +1 stop ≈ 2×). */
export function exposureBrightnessMultiplier(stops: number, referenceStops = LEARN_EXPOSURE_REFERENCE_STOPS): number {
  return Math.pow(2, stops - referenceStops);
}

/**
 * How strongly the sun blows toward white.
 * At f/5.6 with the neutral shutter and ISO this is about 0.9; brighter exposures cap at 1.
 */
export function sunHighlightStrength(brightnessMultiplier: number): number {
  const atF56 = exposureBrightnessMultiplier(
    exposureStops(5.6, LEARN_EXPOSURE_REFERENCE.shutterSec, LEARN_EXPOSURE_REFERENCE.iso),
  );
  const whiteAt = atF56 / 0.9;
  if (whiteAt <= 0) return 1;
  return Math.min(1, Math.max(0, brightnessMultiplier / whiteAt));
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function mixHex(from: string, to: string, t: number) {
  const amount = clamp01(t);
  const parse = (hex: string) => Number.parseInt(hex.slice(1), 16);
  const a = parse(from);
  const b = parse(to);
  const channel = (shift: number) => {
    const start = (a >> shift) & 255;
    const end = (b >> shift) & 255;
    return Math.round(start + (end - start) * amount);
  };
  const mixed = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${mixed.toString(16).padStart(6, '0')}`;
}

export type SunDisk = {
  color: string;
  opacity: number;
};

/**
 * The disk stays brighter than the scene as exposure drops, moving white → yellow → orange → red.
 * Opacity follows exposure the whole way, so it never snaps from a solid color to black.
 */
export function sunDiskForExposure(brightnessMultiplier: number, clipBlack = 0): SunDisk {
  const dark = clamp01(1 - Math.min(brightnessMultiplier, 1));
  let color: string;
  if (dark < 0.66) {
    color = mixHex('#fffdf8', '#ffe566', dark / 0.66);
  } else if (dark < 0.9) {
    color = mixHex('#ffe566', '#ff9a2a', (dark - 0.66) / 0.24);
  } else {
    color = mixHex('#ff9a2a', '#d62818', (dark - 0.9) / 0.1);
  }

  const exposureFade = clamp01(Math.pow(Math.max(brightnessMultiplier, 0), 0.42));
  const opacity = exposureFade * (1 - clamp01(clipBlack));
  return { color, opacity };
}

/**
 * Highlight and shadow clipping.
 * Starts within about one slider step of neutral and is fully blown well before the corner settings.
 */
export function exposureClipOverlays(
  stops: number,
  referenceStops = LEARN_EXPOSURE_REFERENCE_STOPS,
): { white: number; black: number } {
  const delta = stops - referenceStops;
  const white = delta > 0.5 ? Math.min(1, (delta - 0.5) / 0.55) : 0;
  const black = delta < -0.4 ? Math.min(1, (-delta - 0.4) / 0.75) : 0;
  return { white, black };
}

/**
 * Closest aperture and ISO to a neutral exposure, with shutter held fixed.
 * Slightly over or under is close enough. Otherwise focus cannot be confirmed.
 */
export function focusExposureCorrection(
  shutterSec: number,
  apertures: readonly number[],
  isoStops: readonly number[],
) {
  let aperture = apertures[0] ?? 2.8;
  let iso = isoStops[0] ?? 100;
  let delta = exposureStops(aperture, shutterSec, iso) - LEARN_EXPOSURE_REFERENCE_STOPS;
  for (const nextAperture of apertures) {
    for (const nextIso of isoStops) {
      const next = exposureStops(nextAperture, shutterSec, nextIso) - LEARN_EXPOSURE_REFERENCE_STOPS;
      if (Math.abs(next) < Math.abs(delta)) {
        aperture = nextAperture;
        iso = nextIso;
        delta = next;
      }
    }
  }
  return { aperture, iso, delta, reachable: delta > -0.55 && delta < 0.55 };
}

/** Hint for the exposure preview. Brighter and darker use the same distance from neutral. */
export function exposureBaselineHint(delta: number, clipWhite: number, clipBlack: number): string {
  if (clipWhite >= 0.97) return 'Clipped to white — blown highlights';
  if (clipBlack >= 0.97) return 'Clipped to black — lost shadow detail';
  if (delta > 0 && clipWhite > 0.18) return 'Brighter than a neutral baseline — highlights clipping';
  if (delta < 0 && clipBlack > 0.18) return 'Darker than a neutral baseline — shadows clipping';
  if (delta > 0.2) return 'Brighter than a neutral baseline';
  if (delta < -0.2) return 'Darker than a neutral baseline';
  return 'Near a neutral baseline';
}
