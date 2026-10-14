const NAVIGATION_START_EVENT = 'navigation:start';
const NAVIGATION_COMPLETE_EVENT = 'navigation:complete';

export function triggerNavigationProgress() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NAVIGATION_START_EVENT));
  }
}

export function triggerNavigationProgressComplete() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NAVIGATION_COMPLETE_EVENT));
  }
}

export { NAVIGATION_COMPLETE_EVENT, NAVIGATION_START_EVENT };
