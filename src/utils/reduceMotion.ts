/** True when the user or OS prefers reduced motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (document.documentElement.classList.contains('reduce-motion')) {
    return true;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Returns 0 when reduced motion is preferred, otherwise `ms`. */
export function motionDuration(ms: number): number {
  return prefersReducedMotion() ? 0 : ms;
}

/** Returns `'auto'` when reduced motion is preferred, otherwise `behavior`. */
export function scrollBehavior(behavior: ScrollBehavior = 'smooth'): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : behavior;
}
