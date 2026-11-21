export const LEARN_ISO_NOISE_BASE = 100;
export const LEARN_ISO_NOISE_MAX = 6400;

/** Peak grain at ISO 6400 — strong enough to read on the demo preview. */
export const LEARN_ISO_NOISE_MAX_OPACITY = 1;

/** Subtle at ISO 100, but not zero. */
export const LEARN_ISO_NOISE_FLOOR_OPACITY = 0.045;

/** `background-size` for noise tiles — larger px = coarser speckles. */
export const LEARN_ISO_NOISE_TILE_PX_AT_BASE = 360;
export const LEARN_ISO_NOISE_TILE_PX_DELTA = 105;

export type IsoNoiseGrainLayer = {
  /** Master grain visibility (0–1). */
  opacity: number;
  brightness: number;
  contrast: number;
  /** CSS saturate() on colored grain tiles. */
  saturate: number;
  tilePx: number;
  /** 0 at base ISO, 1 at max ISO (log stops). */
  strength: number;
  /** How much RGB chroma speckle to mix in (0–1). */
  chromaStrength: number;
};

function isoNoiseStrength(iso: number, baseIso = LEARN_ISO_NOISE_BASE, maxIso = LEARN_ISO_NOISE_MAX): number {
  const maxStops = Math.log2(maxIso / baseIso);
  if (maxStops <= 0) return 0;
  const stops = Math.max(0, Math.log2(iso / baseIso));
  return Math.min(1, stops / maxStops);
}

export function isoNoiseGrainLayer(
  iso: number,
  baseIso = LEARN_ISO_NOISE_BASE,
  maxIso = LEARN_ISO_NOISE_MAX,
  maxOpacity = LEARN_ISO_NOISE_MAX_OPACITY,
  floorOpacity = LEARN_ISO_NOISE_FLOOR_OPACITY,
): IsoNoiseGrainLayer {
  const t = isoNoiseStrength(iso, baseIso, maxIso);
  const eased = t ** 1.05;
  const opacity = floorOpacity + eased * (maxOpacity - floorOpacity);
  return {
    opacity,
    brightness: 0.9 + eased * 0.22,
    contrast: 1.1 + eased * 0.45,
    saturate: 1.2 + eased * 2.2,
    tilePx: Math.round(LEARN_ISO_NOISE_TILE_PX_AT_BASE - eased * LEARN_ISO_NOISE_TILE_PX_DELTA),
    strength: t,
    chromaStrength: eased ** 1.2,
  };
}

export function isoNoiseOverlayOpacity(
  iso: number,
  baseIso = LEARN_ISO_NOISE_BASE,
  maxIso = LEARN_ISO_NOISE_MAX,
  maxOpacity = LEARN_ISO_NOISE_MAX_OPACITY,
): number {
  return isoNoiseGrainLayer(iso, baseIso, maxIso, maxOpacity).opacity;
}
