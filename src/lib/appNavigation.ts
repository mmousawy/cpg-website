import { useSyncExternalStore } from 'react';

const NAVIGATION_BUSY_EVENT = 'navigation:busy';

let busy = false;
const listeners = new Set<() => void>();

export function setAppNavigationBusy(next: boolean) {
  if (busy === next) return;
  busy = next;
  listeners.forEach((listener) => listener());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NAVIGATION_BUSY_EVENT));
  }
}

export function isAppNavigationBusy() {
  return busy;
}

function subscribeAppNavigationBusy(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppNavigationBusy() {
  return useSyncExternalStore(
    subscribeAppNavigationBusy,
    isAppNavigationBusy,
    () => false,
  );
}

