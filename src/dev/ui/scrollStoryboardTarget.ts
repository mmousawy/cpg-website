import { resolveWorkbenchScrollBehavior } from '@/dev/workbench/motion';

import { notifyStoryboardHashChange } from './storyboardHash';

export const STORYBOARD_SCROLL_GAP_PX = 12;

/** Keep shell fixed; only the storyboard canvas pane should move. */
export function resetStoryboardShellScroll() {
  if (typeof window === 'undefined') return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const main = document.getElementById('main-content');
  if (main) {
    main.scrollTop = 0;
  }
}

function maxScrollTop(container: HTMLElement) {
  return Math.max(0, container.scrollHeight - container.clientHeight);
}

/** Lines up `target` with the top of `container`'s visible area, clamped to natural max (no bottom pad). */
export function getStoryboardScrollTop(
  container: HTMLElement,
  target: HTMLElement,
  gapPx = STORYBOARD_SCROLL_GAP_PX,
) {
  const delta = target.getBoundingClientRect().top - container.getBoundingClientRect().top;
  const next = container.scrollTop + delta - gapPx;
  return Math.min(Math.max(0, next), maxScrollTop(container));
}

export function scrollStoryboardTarget(
  container: HTMLElement,
  targetId: string,
  options?: { behavior?: ScrollBehavior; gapPx?: number },
) {
  const target = document.getElementById(targetId);
  if (!target || !container.contains(target)) {
    return false;
  }

  resetStoryboardShellScroll();

  container.scrollTo({
    top: getStoryboardScrollTop(container, target, options?.gapPx ?? STORYBOARD_SCROLL_GAP_PX),
    behavior: resolveWorkbenchScrollBehavior(options?.behavior ?? 'smooth'),
  });
  return true;
}

export function setStoryboardLocationHash(basePath: string, targetId: string) {
  const nextHash = `#${targetId}`;
  if (window.location.hash === nextHash) {
    return false;
  }
  window.history.pushState(null, '', `${basePath}${nextHash}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  notifyStoryboardHashChange();
  return true;
}
