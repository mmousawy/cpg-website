/** Birds stay sharp at this shutter and faster (1/500 and above). */
export const SHARP_BIRDS_SHUTTER_SEC = 1 / 500;

const SLOW_SHUTTER_SEC = 1;
/** Strong horizontal streak at 1s — tuned for a visible teaching demo. */
const MAX_MOTION_BLUR = 38;

/**
 * Horizontal motion-blur strength for moving subjects (birds).
 * Fast shutter (≥ 1/500) → sharp; slower → streaked toward 1s.
 */
export function shutterMotionBlurStdX(shutterSec: number): number {
  if (shutterSec <= SHARP_BIRDS_SHUTTER_SEC) {
    return 0;
  }
  const sharpLog = Math.log2(SHARP_BIRDS_SHUTTER_SEC);
  const slowLog = Math.log2(SLOW_SHUTTER_SEC);
  const current = Math.log2(shutterSec);
  if (slowLog === sharpLog) return 0;
  const progress = (current - sharpLog) / (slowLog - sharpLog);
  const eased = progress ** 1;
  return Math.max(0, Math.min(MAX_MOTION_BLUR, eased * MAX_MOTION_BLUR));
}
