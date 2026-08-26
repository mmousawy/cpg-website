'use client';

import { useState } from 'react';

/**
 * Stays true after the first time `active` is true, so a lazily loaded UI
 * can keep its close animation without mounting on every page load.
 */
export function useKeepMounted(active: boolean): boolean {
  const [wasActive, setWasActive] = useState(false);
  if (active && !wasActive) {
    setWasActive(true);
  }
  return wasActive || active;
}
