export type LearnFocusPlane = 'far' | 'distant' | 'mid' | 'near' | 'foreground';

/** Distance from the camera. Extra meters matter less the farther a plane already is. */
const PLANE_DISTANCE_M: Record<LearnFocusPlane, number> = {
  foreground: 5,
  near: 20,
  mid: 60,
  distant: 100,
  far: 300,
};

/** SVG depth groups, back to front. */
const LAYER_PLANES = ['far', 'far', 'distant', 'mid', 'near', 'foreground'] as const satisfies readonly LearnFocusPlane[];

/** Blur between the nearest and farthest plane at the widest aperture. */
const MAX_PLANE_SEPARATION_BLUR = 10;

/** Above 1, nearby planes separate more gently than the full near-to-far span. */
const SEPARATION_CURVE = 1.55;

/**
 * Most focus separation builds up in the first few tens of meters.
 * 40 m and 150 m end up close, so the far plane stays sharper.
 */
const FOCUS_FALLOFF_M = 18;

function depthFactor(meters: number): number {
  return 1 - Math.exp(-meters / FOCUS_FALLOFF_M);
}

const DEPTH_FACTOR_SPAN = depthFactor(PLANE_DISTANCE_M.far) - depthFactor(PLANE_DISTANCE_M.foreground);

function separationBlur(subject: LearnFocusPlane, focus: LearnFocusPlane, strength: number): number {
  const gap = Math.abs(depthFactor(PLANE_DISTANCE_M[subject]) - depthFactor(PLANE_DISTANCE_M[focus]));
  const normalized = gap / DEPTH_FACTOR_SPAN;
  return Math.pow(normalized, SEPARATION_CURVE) * MAX_PLANE_SEPARATION_BLUR * strength;
}

export function focusPlaneFromClickTarget(target: Element | null): LearnFocusPlane | null {
  if (!target) return null;
  const host = target.closest('[data-learn-focus-plane]');
  if (!host) return null;
  const plane = host.getAttribute('data-learn-focus-plane');
  if (plane === 'far' || plane === 'distant' || plane === 'mid' || plane === 'near' || plane === 'foreground') {
    return plane;
  }
  return null;
}

export function layerBlursForFocus(
  focusPlane: LearnFocusPlane,
  focusDepth: number,
  uniformBlur = 0,
): number[] {
  const strength = Math.max(0, 1 - focusDepth);

  return LAYER_PLANES.map((plane) => Math.hypot(separationBlur(plane, focusPlane, strength), uniformBlur));
}
