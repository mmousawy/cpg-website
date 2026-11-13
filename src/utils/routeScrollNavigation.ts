import { getScrollTop, scrollContainerTo, subscribeScrollContainer } from '@/utils/scrollContainer';

const scrollPositionsByRoute = new Map<string, number>();

let historyTraversalPending = false;
let skipScrollToTopForRouteChange = false;
let pendingScrollRestoreRouteKey: string | null = null;
let trackingInstalled = false;

export function getRouteScrollCacheKey(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.pathname}${window.location.search}`;
}

/** True when the upcoming route update came from browser back/forward. */
export function consumeHistoryTraversal(): boolean {
  if (!historyTraversalPending) {
    skipScrollToTopForRouteChange = false;
    return false;
  }
  historyTraversalPending = false;
  skipScrollToTopForRouteChange = true;
  return true;
}

/** Used by deferred scroll handlers after `consumeHistoryTraversal` in layout effects. */
export function shouldSkipScrollToTopOnRouteChange(): boolean {
  const skip = skipScrollToTopForRouteChange;
  skipScrollToTopForRouteChange = false;
  return skip;
}

export function cacheCurrentRouteScrollPosition() {
  if (typeof window === 'undefined') return;
  scrollPositionsByRoute.set(getRouteScrollCacheKey(), getScrollTop());
}

export function restoreCachedRouteScrollPosition(): boolean {
  const scrollY = scrollPositionsByRoute.get(getRouteScrollCacheKey());
  if (scrollY === undefined) return false;
  scrollContainerTo(scrollY, 'auto');
  return true;
}

/** Before navigating back to a cached overview, restore its scroll instead of scrolling to top. */
export function prepareScrollRestoreForNavigation(targetPathWithSearch: string) {
  pendingScrollRestoreRouteKey = targetPathWithSearch;
  skipScrollToTopForRouteChange = true;
}

/** True when the active URL matches a prepared overview restore (consumes the pending key). */
export function consumePendingScrollRestore(): boolean {
  if (!pendingScrollRestoreRouteKey) return false;
  const currentKey = getRouteScrollCacheKey();
  const target = pendingScrollRestoreRouteKey;
  pendingScrollRestoreRouteKey = null;
  if (currentKey === target) {
    return true;
  }
  return false;
}

/**
 * Marks popstate navigations and caches scroll positions per URL so back/forward
 * can restore `#main-content` when scroll restoration is manual.
 */
export function ensureRouteScrollNavigationTracking() {
  if (typeof window === 'undefined' || trackingInstalled) return;
  trackingInstalled = true;

  if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
  }

  window.addEventListener(
    'popstate',
    () => {
      historyTraversalPending = true;
    },
    true,
  );

  let rafId: number | null = null;
  const scheduleCache = () => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      cacheCurrentRouteScrollPosition();
    });
  };

  subscribeScrollContainer(scheduleCache);
  scheduleCache();
}
