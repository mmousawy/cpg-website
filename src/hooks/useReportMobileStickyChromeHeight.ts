import { type RefObject, useLayoutEffect } from 'react';

const HEIGHT_VAR = '--mobile-sticky-bar-height';
const OVERLAY_HEIGHT_VAR = '--mobile-overlay-chrome-height';
const EXPANDED_ATTR = 'data-mobile-sticky-chrome-sticky';
const MOBILE_MEDIA = '(max-width: 639px)';

/** Parent bottom within this distance of the pin line = bar at natural rest. */
const SETTLED_ENTER_PX = 4;
/** Parent bottom must exceed this distance before leaving the resting state. */
const SETTLED_EXIT_PX = 10;
const PIN_TOLERANCE_PX = 12;

type ScrimState = 'default' | 'expanded';

function parsePx(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPinLine(el: HTMLElement, style: CSSStyleDeclaration) {
  const stickyBottom = parsePx(style.bottom);
  const navOffset = parsePx(
    getComputedStyle(document.documentElement).getPropertyValue('--mobile-nav-offset'),
  );
  const bottomInset = stickyBottom || navOffset;
  return window.innerHeight - bottomInset;
}

function getScrimState(el: HTMLElement, current: ScrimState): ScrimState {
  if (!window.matchMedia(MOBILE_MEDIA).matches) return 'default';

  const style = window.getComputedStyle(el);
  // Fixed overlay bars (e.g. manage selection actions) always sit above the tab bar.
  if (style.position === 'fixed') {
    return style.display === 'none' ? 'default' : 'expanded';
  }

  const rect = el.getBoundingClientRect();
  if (rect.height < 1) return 'default';

  const pinLine = getPinLine(el, style);
  if (Math.abs(rect.bottom - pinLine) > PIN_TOLERANCE_PX) return 'default';

  const parent = el.parentElement;
  if (!parent) return 'expanded';

  const parentDelta = Math.abs(parent.getBoundingClientRect().bottom - pinLine);

  if (current === 'expanded') {
    return parentDelta <= SETTLED_ENTER_PX ? 'default' : 'expanded';
  }

  return parentDelta > SETTLED_EXIT_PX ? 'expanded' : 'default';
}

function setupReporter(
  el: HTMLElement,
  overlaysContent: boolean,
) {
  const root = document.documentElement;
  let scrimState: ScrimState = 'default';

  const applyScrimState = (next: ScrimState) => {
    if (next === scrimState) return;
    scrimState = next;
    if (next === 'expanded') {
      root.setAttribute(EXPANDED_ATTR, '');
    } else {
      root.removeAttribute(EXPANDED_ATTR);
    }
  };

  const updateHeight = () => {
    const heightPx = `${el.getBoundingClientRect().height}px`;
    root.style.setProperty(HEIGHT_VAR, heightPx);
    if (overlaysContent) {
      root.style.setProperty(OVERLAY_HEIGHT_VAR, heightPx);
    }
  };

  const updateScrimState = () => {
    applyScrimState(getScrimState(el, scrimState));
  };

  const update = () => {
    updateHeight();
    updateScrimState();
  };

  update();

  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe(el);
  const mutationObserver = new MutationObserver(update);
  mutationObserver.observe(el, { attributes: true, attributeFilter: ['data-open', 'class'] });

  window.addEventListener('resize', update);
  el.addEventListener('transitionend', update);
  // Scroll does not bubble; capture so nested overflow containers still update the scrim.
  document.addEventListener('scroll', updateScrimState, { passive: true, capture: true });

  return () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    window.removeEventListener('resize', update);
    el.removeEventListener('transitionend', update);
    document.removeEventListener('scroll', updateScrimState, { capture: true });
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
