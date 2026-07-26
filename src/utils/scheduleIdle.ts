/** Run work after the browser is idle, with a hard timeout fallback. */
export function scheduleIdleWork(callback: () => void, timeoutMs = 2000): void {
  if (typeof window === 'undefined') return;

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: timeoutMs });
    return;
  }

  globalThis.setTimeout(callback, 1);
}
