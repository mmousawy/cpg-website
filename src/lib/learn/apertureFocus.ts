/** Index of f/8 in the learn aperture slider (even focus / sweet spot). */
export const LEARN_OPTIMAL_APERTURE_INDEX = 5;

/** Index of f/5.6. Vignette is gone from this stop onward. */
export const LEARN_VIGNETTE_CLEAR_APERTURE_INDEX = 4;

const MAX_DIFFRACTION_BLUR = 1.2;

/**
 * Shallow depth-of-field strength for apertures wider than f/8 (0 at f/8 and above).
 */
export function apertureFocusSeparationStrength(
  fIndex: number,
  optimalIndex = LEARN_OPTIMAL_APERTURE_INDEX,
): number {
  if (fIndex >= optimalIndex) return 0;
  if (optimalIndex <= 0) return 0;
  return 1 - fIndex / optimalIndex;
}

/** 1 = no plane separation blur (f/8+); 0 = strongest separation (wide open). */
export function apertureEvenFocusDepth(
  fIndex: number,
  optimalIndex = LEARN_OPTIMAL_APERTURE_INDEX,
): number {
  return 1 - apertureFocusSeparationStrength(fIndex, optimalIndex);
}

/**
 * Uniform softness from diffraction for f-stops narrower than f/8 (f/11, f/16).
 */
export function apertureDiffractionBlurStd(
  fIndex: number,
  optimalIndex = LEARN_OPTIMAL_APERTURE_INDEX,
  maxIndex = 7,
): number {
  if (fIndex <= optimalIndex) return 0;
  if (maxIndex <= optimalIndex) return 0;
  const t = (fIndex - optimalIndex) / (maxIndex - optimalIndex);
  return t * MAX_DIFFRACTION_BLUR;
}

/** 1 at f/1.4, 0 at f/5.6 and narrower. */
export function apertureVignetteOpacity(
  fIndex: number,
  clearIndex = LEARN_VIGNETTE_CLEAR_APERTURE_INDEX,
): number {
  if (fIndex >= clearIndex) return 0;
  if (clearIndex <= 0) return 0;
  return 1 - fIndex / clearIndex;
}
