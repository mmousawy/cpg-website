import { type RefObject, useLayoutEffect } from 'react';

const HEIGHT_VAR = '--mobile-sticky-bar-height';
const EXPANDED_ATTR = 'data-mobile-sticky-chrome-sticky';
const MOBILE_MEDIA = '(max-width: 639px)';

/** Parent bottom within this distance of the pin line = bar at natural rest. */
const SETTLED_ENTER_PX = 4;
/** Parent bottom must exceed this distance before leaving the resting state. */
const SETTLED_EXIT_PX = 10;
const PIN_TOLERANCE_PX = 4;

type ScrimState = 'default' | 'expanded';

function getScrimState(el: HTMLElement, current: ScrimState): ScrimState {
  if (!window.matchMedia(MOBILE_MEDIA).matches) return 'default';

  const style = window.getComputedStyle(el);
  if (style.position !== 'sticky') return 'default';

  const stickyBottom = Number.parseFloat(style.bottom);
  if (!Number.isFinite(stickyBottom)) return 'default';

  const rect = el.getBoundingClientRect();
  const pinLine = window.innerHeight - stickyBottom;
  if (Math.abs(rect.bottom - pinLine) > PIN_TOLERANCE_PX) return 'default';

  const parent = el.parentElement;
  if (!parent) return 'default';

  const parentDelta = Math.abs(parent.getBoundingClientRect().bottom - pinLine);

  if (current === 'expanded') {
    return parentDelta <= SETTLED_ENTER_PX ? 'default' : 'expanded';
  }

  return parentDelta > SETTLED_EXIT_PX ? 'expanded' : 'default';
}

export function useReportMobileStickyChromeHeight(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
) {
  useLayoutEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    if (!el) return;

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
      root.style.setProperty(HEIGHT_VAR, `${el.getBoundingClientRect().height}px`);
    };

    const updateScrimState = () => {
      applyScrimState(getScrimState(el, scrimState));
    };

    updateHeight();
    updateScrimState();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
      updateScrimState();
    });
    resizeObserver.observe(el);

    const onResize = () => {
      updateHeight();
      updateScrimState();
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', updateScrimState, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', updateScrimState);
      root.removeAttribute(EXPANDED_ATTR);
      root.style.removeProperty(HEIGHT_VAR);
    };
  }, [enabled]);
}
