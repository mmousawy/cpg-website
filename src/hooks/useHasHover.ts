'use client';

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  const mq = window.matchMedia('(hover: hover)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.matchMedia('(hover: hover)').matches;
}

function getServerSnapshot() {
  return false;
}

/** True when the primary input can hover (fine pointer / mouse). */
export function useHasHover() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
