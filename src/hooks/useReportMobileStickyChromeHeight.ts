import { type RefObject, useLayoutEffect } from 'react';

import { getScrollContainer, subscribeScrollContainer } from '@/utils/scrollContainer';

const HEIGHT_VAR = '--mobile-sticky-bar-height';
const OVERLAY_HEIGHT_VAR = '--mobile-overlay-chrome-height';
const EXPANDED_ATTR = 'data-mobile-sticky-chrome-sticky';
const SETTLE_GAP_CLASS = 'mobile-sticky-bar-settle-gap';
const MOBILE_MEDIA = '(max-width: 639px)';

/** Bar bottom within this distance of the pin line = currently stuck. */
const PIN_TOLERANCE_PX = 12;
/** Settle-gap sibling is adjacent in flow when its top matches the bar's bottom. */
const SETTLED_ADJACENT_PX = 6;

function parsePx(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPinLine(el: HTMLElement, style: CSSStyleDeclaration) {
  const stickyBottom = parsePx(style.bottom);
  const scrollContainer = getScrollContainer();
  if (scrollContainer) {
    const { bottom } = scrollContainer.getBoundingClientRect();
    return bottom - stickyBottom;
  }

  return window.innerHeight - stickyBottom;
}

function getSettleGap(el: HTMLElement) {
  const next = el.nextElementSibling;
  if (!(next instanceof HTMLElement)) return null;
  if (next.hidden) return null;
  if (!next.classList.contains(SETTLE_GAP_CLASS)) return null;
  return next;
}

function isLaidOut(el: HTMLElement) {
  if (el.hidden) return false;
  return el.getClientRects().length > 0;
}

function getSlideSurface(el: HTMLElement) {
  return el.querySelector<HTMLElement>('.mobile-sticky-bar-slide') ?? el;
}

function isSettledInFlow(el: HTMLElement, rect: DOMRect) {
  const gap = getSettleGap(el);
  if (!gap) return false;
  return Math.abs(gap.getBoundingClientRect().top - rect.bottom) <= SETTLED_ADJACENT_PX;
}

/** Only the laid-out bar may clear the shared chrome variables on unmount. */
let chromePublisher: object | null = null;

function isStickyChromeExpanded(el: HTMLElement): boolean {
  if (!window.matchMedia(MOBILE_MEDIA).matches) return false;

  const style = window.getComputedStyle(el);
  if (style.display === 'none' || el.hidden) return false;
  const slide = getSlideSurface(el);
  if (slide.classList.contains('mobile-sticky-bar-slide') && !slide.hasAttribute('data-open')) {
    return false;
  }
  if (style.position === 'fixed') {
    return true;
  }

  const rect = el.getBoundingClientRect();
  if (rect.height < 1) return false;

  const gap = getSettleGap(el);
  if (gap) {
    return !isSettledInFlow(el, rect);
  }

  const pinLine = getPinLine(el, style);
  return Math.abs(rect.bottom - pinLine) <= PIN_TOLERANCE_PX;
}

function setupReporter(
  el: HTMLElement,
  overlaysContent: boolean,
) {
  const root = document.documentElement;
  const token = {};
  let lastStuck: boolean | null = null;

  const publishHeight = () => {
    const heightPx = `${Math.round(el.getBoundingClientRect().height)}px`;
    if (root.style.getPropertyValue(HEIGHT_VAR) !== heightPx) {
      root.style.setProperty(HEIGHT_VAR, heightPx);
    }
    if (overlaysContent && root.style.getPropertyValue(OVERLAY_HEIGHT_VAR) !== heightPx) {
      root.style.setProperty(OVERLAY_HEIGHT_VAR, heightPx);
    }
  };

  const publishStuck = () => {
    if (!isLaidOut(el)) return;

    if (!window.matchMedia(MOBILE_MEDIA).matches) {
      if (chromePublisher !== token) return;
      lastStuck = false;
      root.removeAttribute(EXPANDED_ATTR);
      return;
    }

    chromePublisher = token;
    const stuck = isStickyChromeExpanded(el);
    if (stuck === lastStuck) return;
    lastStuck = stuck;
    if (stuck) {
      root.setAttribute(EXPANDED_ATTR, '');
    } else {
      root.removeAttribute(EXPANDED_ATTR);
    }
  };

  const onLayoutChange = () => {
    // Account settings mounts a mobile stack and a desktop save bar together.
    // The hidden one still has a reporter; letting it publish fights the visible bar.
    if (!isLaidOut(el)) return;
    chromePublisher = token;
    publishHeight();
    publishStuck();
  };

  let scrollRaf = 0;
  const onScroll = () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      publishStuck();
    });
  };

  onLayoutChange();

  const resizeObserver = new ResizeObserver(onLayoutChange);
  resizeObserver.observe(el);
  const mutationObserver = new MutationObserver(onLayoutChange);
  mutationObserver.observe(el, { attributes: true, attributeFilter: ['data-open', 'class', 'hidden'] });

  window.addEventListener('resize', onLayoutChange);
  el.addEventListener('transitionend', onLayoutChange);
  const unsubscribeScroll = subscribeScrollContainer(onScroll);

  return () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    window.removeEventListener('resize', onLayoutChange);
    el.removeEventListener('transitionend', onLayoutChange);
    unsubscribeScroll();
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    if (chromePublisher !== token) return;
    chromePublisher = null;
    root.removeAttribute(EXPANDED_ATTR);
    root.style.removeProperty(HEIGHT_VAR);
    if (overlaysContent) {
      root.style.removeProperty(OVERLAY_HEIGHT_VAR);
    }
  };
}

export function useReportMobileStickyChromeHeight(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
  overlaysContent = false,
) {
  useLayoutEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let rafId = 0;
    let teardown: (() => void) | undefined;

    const attach = () => {
      if (cancelled) return;
      const el = ref.current;
      if (!el) {
        rafId = requestAnimationFrame(attach);
        return;
      }
      teardown = setupReporter(el, overlaysContent);
    };

    attach();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      teardown?.();
    };
  }, [enabled, overlaysContent, ref]);
}
