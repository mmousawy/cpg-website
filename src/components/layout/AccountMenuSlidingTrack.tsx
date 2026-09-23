'use client';

import { prefersReducedMotion } from '@/utils/reduceMotion';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const SLIDE_MS = 300;
const SLIDE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

function getMaxMenuHeightPx() {
  if (typeof window === 'undefined') return 448;
  return Math.min(window.innerHeight * 0.7, 28 * 16);
}

type AccountMenuSlidingTrackProps = {
  view: 'root' | 'site';
  root: ReactNode;
  site: ReactNode;
};

export default function AccountMenuSlidingTrack({
  view,
  root,
  site,
}: AccountMenuSlidingTrackProps) {
  const rootInnerRef = useRef<HTMLDivElement>(null);
  const siteInnerRef = useRef<HTMLDivElement>(null);
  const [heightPx, setHeightPx] = useState<number | null>(null);
  const [heightTransitionsEnabled, setHeightTransitionsEnabled] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const update = () => setReduceMotion(prefersReducedMotion());
    update();
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', update);
    window.addEventListener('display-preferences-changed', update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('display-preferences-changed', update);
    };
  }, []);

  const measureView = useCallback((target: 'root' | 'site') => {
    const el = target === 'root' ? rootInnerRef.current : siteInnerRef.current;
    if (!el) return null;
    const natural = el.offsetHeight;
    if (target === 'site') return natural;
    return Math.min(natural, getMaxMenuHeightPx());
  }, []);

  const prevViewRef = useRef(view);

  // Initial height: root panel, no height transition when the popover first opens.
  useLayoutEffect(() => {
    setHeightTransitionsEnabled(false);
    const next = measureView('root');
    if (next !== null) setHeightPx(next);
    const id = requestAnimationFrame(() => {
      setHeightTransitionsEnabled(true);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only sizing
  }, []);

  // Animate viewport height from A → B when drilling in or back.
  useLayoutEffect(() => {
    if (prevViewRef.current === view) return;
    prevViewRef.current = view;
    const next = measureView(view);
    if (next === null) return;

    // Commit one frame at the previous height, then tween to the new panel height.
    const id = requestAnimationFrame(() => {
      setHeightPx(next);
    });
    return () => cancelAnimationFrame(id);
  }, [view, measureView]);

  useLayoutEffect(() => {
    const nodes = [rootInnerRef.current, siteInnerRef.current].filter(
      Boolean,
    ) as HTMLElement[];
    if (nodes.length === 0) return;

    const ro = new ResizeObserver(() => {
      const next = measureView(view);
      if (next !== null) setHeightPx(next);
    });
    nodes.forEach((node) => ro.observe(node));
    return () => ro.disconnect();
  }, [view, measureView]);

  if (reduceMotion) {
    return (
      <div
        className={
          view === 'site'
            ? 'overflow-x-hidden'
            : 'max-h-[min(70vh,28rem)] overflow-x-hidden overflow-y-auto'
        }
      >
        {view === 'root' ? root : site}
      </div>
    );
  }

  const viewportHeightStyle = {
    height: heightPx !== null ? `${heightPx}px` : 'auto',
    maxHeight: view === 'site' ? undefined : 'min(70vh, 28rem)',
    transition: heightTransitionsEnabled
      ? `height ${SLIDE_MS}ms ${SLIDE_EASE}`
      : 'none',
  };

  const paneShellClass = (pane: 'root' | 'site') =>
    pane === 'site'
      ? 'w-1/2 shrink-0 self-start overflow-x-hidden'
      : 'w-1/2 shrink-0 self-start overflow-x-hidden overflow-y-auto';

  return (
    <div
      className="overflow-hidden"
      style={viewportHeightStyle}
    >
      <div
        className="flex w-[200%] items-start"
        style={{
          transform: view === 'site' ? 'translateX(-50%)' : 'translateX(0)',
          transition: `transform ${SLIDE_MS}ms ${SLIDE_EASE}`,
        }}
      >
        <div
          className={paneShellClass('root')}
          style={
            heightPx !== null && view === 'root'
              ? { maxHeight: `${heightPx}px` }
              : undefined
          }
          aria-hidden={view !== 'root'}
          inert={view !== 'root'}
        >
          <div ref={rootInnerRef}>
            {root}
          </div>
        </div>
        <div
          className={paneShellClass('site')}
          aria-hidden={view !== 'site'}
          inert={view !== 'site'}
        >
          <div ref={siteInnerRef}>
            {site}
          </div>
        </div>
      </div>
    </div>
  );
}
