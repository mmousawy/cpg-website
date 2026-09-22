import { type RefObject, useLayoutEffect } from 'react';

import { getScrollContainer, subscribeScrollContainer } from '@/utils/scrollContainer';

const HEIGHT_VAR = '--mobile-sticky-bar-height';
const OVERLAY_HEIGHT_VAR = '--mobile-overlay-chrome-height';
const SCRIM_HEIGHT_VAR = '--mobile-tab-bar-scrim-height';
const EXPANDED_ATTR = 'data-mobile-sticky-chrome-sticky';
const SETTLE_GAP_CLASS = 'mobile-sticky-bar-settle-gap';
const MOBILE_MEDIA = '(max-width: 639px)';

/** Bar bottom within this distance of the pin line = currently stuck. */
const PIN_TOLERANCE_PX = 12;
/** Settle-gap sibling is adjacent in flow when its top matches the bar's bottom. */
const SETTLED_ADJACENT_PX = 6;

type ScrimState = 'default' | 'expanded';

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

function remPx(rem: number) {
  return rem * (parsePx(getComputedStyle(document.documentElement).fontSize) || 16);
}

function getNavOffset() {
  const fromVar = parsePx(
    getComputedStyle(document.documentElement).getPropertyValue('--mobile-nav-offset'),
  );
  if (fromVar > 0) return fromVar;

  const tabBar = document.querySelector('.mobile-tab-bar');
  if (tabBar instanceof HTMLElement) {
    return tabBar.getBoundingClientRect().height;
  }
  return 0;
}

function measureScrimHeightPx(el: HTMLElement, state: ScrimState) {
  const navOffset = getNavOffset();
  if (state === 'expanded') {
    return navOffset + el.getBoundingClientRect().height + remPx(1.5);
  }
  return Math.max(remPx(4.5), navOffset + remPx(0.5));
}

function isSettledInFlow(el: HTMLElement, rect: DOMRect) {
  const gap = getSettleGap(el);
  if (!gap) return false;
  return Math.abs(gap.getBoundingClientRect().top - rect.bottom) <= SETTLED_ADJACENT_PX;
}

function getScrimState(el: HTMLElement): ScrimState {
  if (!window.matchMedia(MOBILE_MEDIA).matches) return 'default';

  const style = window.getComputedStyle(el);
  if (style.display === 'none' || el.hidden) return 'default';
  if (el.classList.contains('mobile-sticky-bar-slide') && !el.hasAttribute('data-open')) {
    return 'default';
  }
  if (style.position === 'fixed') {
    return 'expanded';
  }

  const rect = el.getBoundingClientRect();
  if (rect.height < 1) return 'default';

  const gap = getSettleGap(el);
  if (gap) {
    return isSettledInFlow(el, rect) ? 'default' : 'expanded';
  }

  const pinLine = getPinLine(el, style);
  if (Math.abs(rect.bottom - pinLine) <= PIN_TOLERANCE_PX) return 'expanded';

  return 'default';
}

function setupReporter(
  el: HTMLElement,
  overlaysContent: boolean,
) {
  const root = document.documentElement;

  const applyScrimState = (next: ScrimState) => {
    const heightPx = `${measureScrimHeightPx(el, next)}px`;
    if (root.style.getPropertyValue(SCRIM_HEIGHT_VAR) !== heightPx) {
      root.style.setProperty(SCRIM_HEIGHT_VAR, heightPx);
    }
    if (next === 'expanded') {
      root.setAttribute(EXPANDED_ATTR, '');
    } else {
      root.removeAttribute(EXPANDED_ATTR);
    }
  };

  const updateHeight = () => {
    const heightPx = `${el.getBoundingClientRect().height}px`;
    if (root.style.getPropertyValue(HEIGHT_VAR) !== heightPx) {
      root.style.setProperty(HEIGHT_VAR, heightPx);
    }
    if (overlaysContent && root.style.getPropertyValue(OVERLAY_HEIGHT_VAR) !== heightPx) {
      root.style.setProperty(OVERLAY_HEIGHT_VAR, heightPx);
    }
  };

  const updateScrimState = () => {
    applyScrimState(getScrimState(el));
  };

  let scrollRaf = 0;
  const updateScrimStateOnScroll = () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      updateScrimState();
    });
  };

  const update = () => {
    updateHeight();
    updateScrimState();
  };

  update();

  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe(el);
  const mutationObserver = new MutationObserver(update);
  mutationObserver.observe(el, { attributes: true, attributeFilter: ['data-open', 'class', 'hidden'] });

  window.addEventListener('resize', update);
  el.addEventListener('transitionend', update);
  const unsubscribeScroll = subscribeScrollContainer(updateScrimStateOnScroll);
  document.addEventListener('scroll', updateScrimStateOnScroll, { passive: true, capture: true });
  const rootObserver = new MutationObserver(update);
  rootObserver.observe(root, { attributes: true, attributeFilter: ['style'] });

  return () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    rootObserver.disconnect();
    window.removeEventListener('resize', update);
    el.removeEventListener('transitionend', update);
    unsubscribeScroll();
    document.removeEventListener('scroll', updateScrimStateOnScroll, { capture: true });
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    root.removeAttribute(EXPANDED_ATTR);
    root.style.removeProperty(HEIGHT_VAR);
    root.style.removeProperty(SCRIM_HEIGHT_VAR);
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
