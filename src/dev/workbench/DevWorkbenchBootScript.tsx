'use client';

import { useLayoutEffect } from 'react';

import { DEV_WORKBENCH_PAGE_CLASS } from '@/utils/devWorkbenchPath';

/** Sets `dev-workbench-page` on first paint (before DocumentRouteState runs on navigation). */
export default function DevWorkbenchBootScript() {
  useLayoutEffect(() => {
    document.documentElement.classList.add(DEV_WORKBENCH_PAGE_CLASS);
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    return () => {
      document.documentElement.classList.remove(DEV_WORKBENCH_PAGE_CLASS);
    };
  }, []);

  return null;
}
