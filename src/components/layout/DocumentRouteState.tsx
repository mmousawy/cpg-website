'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

import { resetBodyScrollLock } from '@/lib/bodyScrollLock';
import { dispatchRouteChange } from '@/lib/routeChange';
import { isManagePagePath } from '@/utils/managePage';
import { closeOpenPhotoSwipes } from '@/utils/photoswipe';

/**
 * Keeps document-level scroll chrome in sync with the active route.
 * CSS `:has(.manage-page)` cannot be used: Next.js may keep the previous
 * route in the DOM, so that selector stays matched after navigation.
 *
 * Must stay inside `<Suspense>` — `usePathname()` is a blocking client hook.
 */
export default function DocumentRouteState() {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  useLayoutEffect(() => {
    const isManage = isManagePagePath(pathname);
    document.documentElement.classList.toggle('manage-page', isManage);
    // Restore body styles without jumping to the previous lock scrollY.
    resetBodyScrollLock();
    closeOpenPhotoSwipes();

    if (prevPathnameRef.current !== pathname) {
      dispatchRouteChange();
    }
    prevPathnameRef.current = pathname;

    return () => {
      if (isManage) {
        document.documentElement.classList.remove('manage-page');
      }
    };
  }, [pathname]);

  return null;
}
