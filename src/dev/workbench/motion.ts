/** Storybook-style motion defaults for dev workbench sidebars and canvas jumps. */
export const WORKBENCH_MOTION_MS = 200;

export function workbenchTransitionMs(): number {
  if (typeof window === 'undefined') return WORKBENCH_MOTION_MS;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : WORKBENCH_MOTION_MS;
}

export function resolveWorkbenchScrollBehavior(preferred: ScrollBehavior): ScrollBehavior {
  if (typeof window === 'undefined') return preferred;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'auto';
  }
  return preferred;
}
