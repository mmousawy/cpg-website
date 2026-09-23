'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

import { resetMobileStickyChromeDocumentState } from '@/hooks/useReportMobileStickyChromeHeight';
import { resetBodyScrollLock } from '@/lib/bodyScrollLock';
import { dispatchRouteChange } from '@/lib/routeChange';
import { isManagePagePath } from '@/utils/managePage';
import { isMobilePinnedShellPath } from '@/utils/mobilePinnedShell';
import { isMobileTerminalStickySettlePath } from '@/utils/mobileTerminalStickySettle';
import { refreshScrollContainerBinding, resetScrollContainer, resetWindowScroll } from '@/utils/scrollContainer';
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

  const pinnedMobileShell = isMobilePinnedShellPath(pathname);

  useLayoutEffect(() => {
    const isManage = isManagePagePath(pathname);
    document.documentElement.classList.toggle('manage-page', isManage);
    document.documentElement.classList.toggle('mobile-pinned-shell', pinnedMobileShell);
    document.documentElement.classList.toggle(
      'mobile-terminal-sticky-settle',
      isMobileTerminalStickySettlePath(pathname),
    );
    if (pinnedMobileShell && window.matchMedia('(max-width: 639px)').matches) {
      if (history.scrollRestoration) {
        history.scrollRestoration = 'manual';
      }
      resetWindowScroll();
    }
    resetBodyScrollLock();
    closeOpenPhotoSwipes();
    refreshScrollContainerBinding();

    const pathChanged = prevPathnameRef.current !== pathname;
    if (pathChanged) {
      dispatchRouteChange();
      resetMobileStickyChromeDocumentState();
    }
    if (!window.location.hash && (pathChanged || pinnedMobileShell)) {
      resetScrollContainer();
    }
    prevPathnameRef.current = pathname;
  }, [pathname, pinnedMobileShell]);

  return null;
}
