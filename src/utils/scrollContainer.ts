/** Scroll container when the mobile shell pins chrome and only `#main-content` scrolls. */
export function isMobilePinnedShell(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('mobile-pinned-shell');
}

export function getScrollContainer(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (!isMobilePinnedShell()) return null;
  return document.getElementById('main-content');
}

export function getScrollTop(): number {
  const container = getScrollContainer();
  return container ? container.scrollTop : window.scrollY;
}

export function scrollContainerTo(top: number, behavior: ScrollBehavior = 'auto') {
  const container = getScrollContainer();
  if (container) {
    container.scrollTo({ top, behavior });
    return;
  }
  window.scrollTo({ top, behavior });
}

export function resetWindowScroll() {
  if (typeof window === 'undefined') return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function resetScrollContainer() {
  resetWindowScroll();
  const main = typeof document === 'undefined' ? null : document.getElementById('main-content');
  if (main && isMobilePinnedShell()) {
    main.scrollTop = 0;
  }
}

type ScrollListener = () => void;

const scrollListeners = new Set<ScrollListener>();

function getScrollEventTarget(): EventTarget {
  return getScrollContainer() ?? window;
}

function notifyScrollListeners() {
  scrollListeners.forEach((listener) => listener());
}

let boundTarget: EventTarget | null = null;

function bindScrollTarget() {
  const target = getScrollEventTarget();
  if (target === boundTarget) return;

  if (boundTarget) {
    boundTarget.removeEventListener('scroll', notifyScrollListeners);
  }

  boundTarget = target;
  boundTarget.addEventListener('scroll', notifyScrollListeners, { passive: true });
}

export function subscribeScrollContainer(listener: ScrollListener): () => void {
  scrollListeners.add(listener);
  bindScrollTarget();

  return () => {
    scrollListeners.delete(listener);
    if (scrollListeners.size === 0 && boundTarget) {
      boundTarget.removeEventListener('scroll', notifyScrollListeners);
      boundTarget = null;
    }
  };
}

/** Re-bind after route / shell class changes (e.g. client navigation). */
export function refreshScrollContainerBinding() {
  if (scrollListeners.size === 0) return;
  bindScrollTarget();
}
