/**
 * Scroll positioning that respects the sticky header.
 * Reads the header height directly for reliable offset calculation.
 */

import { scrollBehavior as resolveScrollBehavior } from '@/utils/reduceMotion';
import { getScrollTop, scrollContainerTo } from '@/utils/scrollContainer';

const MOBILE_STICKY_MEDIA = '(max-width: 639px)';

function getHeaderOffset(): number {
  if (typeof window === 'undefined') return 0;
  const header = document.querySelector('header');
  if (header) return header.getBoundingClientRect().height + 16;
  return 112; // ~7rem fallback
}

/** Full sticky page-title height. Scrolling up reveals it, so section jumps must clear it. */
function getStickyPageHeadingOffset(scrollingUp: boolean): number {
  if (!scrollingUp) return 0;
  if (!window.matchMedia(MOBILE_STICKY_MEDIA).matches) return 0;
  const heading = document.querySelector<HTMLElement>('[data-sticky-page-heading]');
  if (!heading) return 0;
  return heading.offsetHeight;
}

export function scrollToIdWithStickyHeaderOffset(
  id: string,
  behavior: ScrollBehavior = 'smooth',
): boolean {
  if (typeof window === 'undefined') return false;

  const maxRetries = 120;
  const retryDelayMs = 50;

  const scrollToTarget = (remainingRetries: number): boolean => {
    const el = document.getElementById(id);
    if (!el) {
      if (remainingRetries <= 0) return false;
      window.setTimeout(() => {
        scrollToTarget(remainingRetries - 1);
      }, retryDelayMs);
      return true;
    }

    const scrollTop = getScrollTop();
    const elTop = el.getBoundingClientRect().top + scrollTop;
    const offset = getHeaderOffset();
    const scrollingUp = elTop - offset < scrollTop - 1;
    const top = elTop - offset - getStickyPageHeadingOffset(scrollingUp);
    scrollContainerTo(Math.max(0, top), resolveScrollBehavior(behavior));
    return true;
  };

  return scrollToTarget(maxRetries);
}
