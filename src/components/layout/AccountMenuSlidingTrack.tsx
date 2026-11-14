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

export type AccountMenuView = 'root' | 'site' | 'appearance';

const MENU_VIEWS: AccountMenuView[] = ['root', 'site', 'appearance'];

type AccountMenuSlidingTrackProps = {
  view: AccountMenuView;
  root: ReactNode;
  site: ReactNode;
  appearance: ReactNode;
};

export default function AccountMenuSlidingTrack({
  view,
  root,
  site,
  appearance,
}: AccountMenuSlidingTrackProps) {
  const rootInnerRef = useRef<HTMLDivElement>(null);
  const siteInnerRef = useRef<HTMLDivElement>(null);
  const appearanceInnerRef = useRef<HTMLDivElement>(null);
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

  const measureView = useCallback((target: AccountMenuView) => {
    const el = target === 'root'
      ? rootInnerRef.current
      : target === 'site'
        ? siteInnerRef.current
        : appearanceInnerRef.current;
    if (!el) return null;
    const natural = el.offsetHeight;
    if (target !== 'root') return natural;
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
    const nodes = [
      rootInnerRef.current,
      siteInnerRef.current,
      appearanceInnerRef.current,
    ].filter(Boolean) as HTMLElement[];
    if (nodes.length === 0) return;

    const ro = new ResizeObserver(() => {
      const next = measureView(view);
      if (next !== null) setHeightPx(next);
    });
    nodes.forEach((node) => ro.observe(node));
    return () => ro.disconnect();
  }, [view, measureView]);

  const panes: { id: AccountMenuView; node: ReactNode; ref: typeof rootInnerRef }[] = [
    { id: 'root', node: root, ref: rootInnerRef },
    { id: 'site', node: site, ref: siteInnerRef },
    { id: 'appearance', node: appearance, ref: appearanceInnerRef },
  ];

  if (reduceMotion) {
    const active = panes.find((pane) => pane.id === view) ?? panes[0];
    return (
      <div
        className={
          view === 'root'
            ? 'max-h-[min(70vh,28rem)] overflow-x-hidden overflow-y-auto'
            : 'overflow-x-hidden'
        }
      >
        {active.node}
      </div>
    );
  }

  const viewportHeightStyle = {
    height: heightPx !== null ? `${heightPx}px` : 'auto',
    maxHeight: view === 'root' ? 'min(70vh, 28rem)' : undefined,
    transition: heightTransitionsEnabled
      ? `height ${SLIDE_MS}ms ${SLIDE_EASE}`
      : 'none',
  };

  const paneShellClass = (pane: AccountMenuView) =>
    pane === 'root'
      ? 'w-1/3 shrink-0 self-start overflow-x-hidden overflow-y-auto'
      : 'w-1/3 shrink-0 self-start overflow-x-hidden';

  const viewIndex = MENU_VIEWS.indexOf(view);

  return (
    <div
      className="overflow-hidden"
      style={viewportHeightStyle}
    >
      <div
        className="flex w-[300%] items-start"
        style={{
          transform: `translateX(calc(-${viewIndex} * 100% / ${MENU_VIEWS.length}))`,
          transition: `transform ${SLIDE_MS}ms ${SLIDE_EASE}`,
        }}
      >
        {panes.map((pane) => (
          <div
            key={pane.id}
            className={paneShellClass(pane.id)}
            style={
              heightPx !== null && view === 'root' && pane.id === 'root'
                ? { maxHeight: `${heightPx}px` }
                : undefined
            }
            aria-hidden={view !== pane.id}
            inert={view !== pane.id}
          >
            <div
              ref={pane.ref}
            >
              {pane.node}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
