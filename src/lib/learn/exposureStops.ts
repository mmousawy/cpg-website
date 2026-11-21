/**
 * Sliders span many real stops; at 1:1 the scene clips too fast.
 * Depth of field still uses raw f-stops on the aperture slider (see focus depth in the interactive).
 */
/** One slider step on aperture, shutter, or ISO shifts exposure by the same modest amount. */
export const LEARN_APERTURE_STOP_WEIGHT = 0.22;
export const LEARN_SHUTTER_STOP_WEIGHT = 0.22;
export const LEARN_ISO_STOP_WEIGHT = 0.22;

/**
 * Relative exposure in stops from the exposure triangle (same f, ISO: longer shutter → higher value).
 */
export function exposureStops(f: number, shutterSec: number, iso: number): number {
  const apertureStops = Math.log2(f * f) * LEARN_APERTURE_STOP_WEIGHT;
  const shutterStops = Math.log2(shutterSec) * LEARN_SHUTTER_STOP_WEIGHT;
  const isoStops = Math.log2(iso / 100) * LEARN_ISO_STOP_WEIGHT;
  return shutterStops - apertureStops + isoStops;
}
