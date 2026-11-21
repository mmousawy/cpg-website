'use client';

import clsx from 'clsx';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

const DRAG_THRESHOLD_PX = 10;
const MIN_SCALE = 1;
const MAX_SCALE = 3.5;
export const DEFAULT_MOBILE_DIAGRAM_SCALE = 1.35;
const WHEEL_ZOOM_INTENSITY = 0.0012;

type Point = { x: number; y: number };

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function panLimitsForScale(viewportW: number, viewportH: number, scale: number) {
  const excessW = viewportW * (scale - 1);
  const excessH = viewportH * (scale - 1);
  return {
    minX: -excessW / 2,
    maxX: excessW / 2,
    minY: -excessH / 2,
    maxY: excessH / 2,
  };
}

function clampPan(
  x: number,
  y: number,
  viewportW: number,
  viewportH: number,
  scale: number,
): { x: number; y: number } {
  const { minX, maxX, minY, maxY } = panLimitsForScale(viewportW, viewportH, scale);
  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  };
}

type LearnDiagramPinchPanProps = {
  children: ReactNode;
  /** When false, children render without a transform wrapper. */
  enabled: boolean;
  /** Applied when `enabled` becomes true and when `defaultScale` changes. */
  defaultScale?: number;
  className?: string;
};

export default function LearnDiagramPinchPan({
  children,
  enabled,
  defaultScale = 1,
  className,
}: LearnDiagramPinchPanProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null);
  const panStartRef = useRef<{
    pointerId: number;
    origin: Point;
    pan: Point;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const panningRef = useRef(false);

  const [transform, setTransform] = useState(() => ({
    scale: 1,
    x: 0,
    y: 0,
  }));
  const [isPanning, setIsPanning] = useState(false);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const initial = {
      scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, defaultScale)),
      x: 0,
      y: 0,
    };
    transformRef.current = initial;
    setTransform(initial);
  }, [defaultScale, enabled]);

  const applyTransform = useCallback((next: { scale: number; x: number; y: number }) => {
    const el = viewportRef.current;
    if (!el) {
      setTransform(next);
      return;
    }
    const { width, height } = el.getBoundingClientRect();
    const clamped = clampPan(next.x, next.y, width, height, next.scale);
    const applied = { scale: next.scale, ...clamped };
    transformRef.current = applied;
    setTransform(applied);
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0) {
        return;
      }
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      suppressClickRef.current = false;

      if (pointersRef.current.size === 2) {
        const pts = [...pointersRef.current.values()];
        pinchStartRef.current = {
          distance: distance(pts[0], pts[1]),
          scale: transformRef.current.scale,
        };
        panStartRef.current = null;
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }

      if (pointersRef.current.size === 1) {
        panStartRef.current = {
          pointerId: event.pointerId,
          origin: { x: event.clientX, y: event.clientY },
          pan: { x: transformRef.current.x, y: transformRef.current.y },
        };
      }
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled || !pointersRef.current.has(event.pointerId)) {
        return;
      }
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointersRef.current.size === 2 && pinchStartRef.current) {
        const pts = [...pointersRef.current.values()];
        const dist = distance(pts[0], pts[1]);
        const ratio = dist / Math.max(pinchStartRef.current.distance, 1);
        const nextScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, pinchStartRef.current.scale * ratio),
        );
        const { x, y } = transformRef.current;
        applyTransform({ scale: nextScale, x, y });
        event.preventDefault();
        return;
      }

      const panStart = panStartRef.current;
      if (
        panStart &&
        panStart.pointerId === event.pointerId &&
        pointersRef.current.size === 1 &&
        transformRef.current.scale > MIN_SCALE + 0.02
      ) {
        const dx = event.clientX - panStart.origin.x;
        const dy = event.clientY - panStart.origin.y;
        if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          suppressClickRef.current = true;
          panningRef.current = true;
          setIsPanning(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          applyTransform({
            scale: transformRef.current.scale,
            x: panStart.pan.x + dx,
            y: panStart.pan.y + dy,
          });
          event.preventDefault();
        }
      }
    },
    [applyTransform, enabled],
  );

  const finishPointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    panningRef.current = false;
    setIsPanning(false);
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    if (panStartRef.current?.pointerId === event.pointerId) {
      panStartRef.current = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      finishPointer(event);
    },
    [finishPointer],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      finishPointer(event);
    },
    [finishPointer],
  );

  const onClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !enabled) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rawDelta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const zoomDelta = -rawDelta * WHEEL_ZOOM_INTENSITY;
      const oldScale = transformRef.current.scale;
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, oldScale * Math.exp(zoomDelta)),
      );
      if (Math.abs(nextScale - oldScale) < 1e-4) {
        return;
      }

      const rect = viewport.getBoundingClientRect();
      const offsetX = event.clientX - rect.left - rect.width / 2;
      const offsetY = event.clientY - rect.top - rect.height / 2;
      const ratio = nextScale / oldScale;
      const { x, y } = transformRef.current;

      applyTransform({
        scale: nextScale,
        x: x - offsetX * (ratio - 1),
        y: y - offsetY * (ratio - 1),
      });
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [applyTransform, enabled]);

  const canPan = transform.scale > MIN_SCALE + 0.02;

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={viewportRef}
      data-prevent-pull-refresh
      className={clsx(
        'learn-canon-diagram-pinch-viewport relative h-full min-h-0 w-full overflow-hidden',
        canPan && !isPanning && 'cursor-grab',
        isPanning && 'cursor-grabbing',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
    >
      <div
        className="h-full w-full origin-center will-change-transform"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        {children}
      </div>
      <p
        className="pointer-events-none absolute bottom-1 left-1/2 z-10 -translate-x-1/2 rounded-md bg-background-light/90 px-2 py-0.5 text-[10px] text-foreground/55 backdrop-blur-sm sm:hidden"
        aria-hidden
      >
        Pinch to zoom · drag to pan
      </p>
      <p
        className="pointer-events-none absolute bottom-1 left-1/2 z-10 hidden -translate-x-1/2 rounded-md bg-background-light/90 px-2 py-0.5 text-[10px] text-foreground/55 backdrop-blur-sm sm:block"
        aria-hidden
      >
        Scroll to zoom · drag to pan when zoomed
      </p>
    </div>
  );
}
