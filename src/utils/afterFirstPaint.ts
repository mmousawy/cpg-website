import { scheduleIdleWork } from '@/utils/scheduleIdle';

/** Defer work until after the first paint (hero/LCP), then when the browser is idle. */
export function afterFirstPaint(callback: () => void, idleTimeoutMs = 4000): void {
  if (typeof window === 'undefined') return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scheduleIdleWork(callback, idleTimeoutMs);
    });
  });
}
