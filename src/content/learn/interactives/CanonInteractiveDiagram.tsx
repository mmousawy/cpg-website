'use client';

import clsx from 'clsx';
import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type SVGProps,
} from 'react';

import { tooltipSurfaceClassName } from '@/components/shared/Tooltip';

import type { CameraPart } from './cameraAnatomyData';
import { CANON_CALLOUT_DOT_SELECTOR } from './canonCalloutSelectors';
import { CanonDiagram, type CanonDiagramId } from './canonDiagrams';

const DIAGRAM_CLASS = 'learn-canon-diagram';

/** ViewBox units — at this distance from a dot, it stays at `MIN_CALLOUT_RADIUS`. */
const PROXIMITY_RADIUS = 96;
const MIN_CALLOUT_RADIUS = 2;
const MAX_CALLOUT_RADIUS = 8;

function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }
  const mapped = pt.matrixTransform(ctm.inverse());
  return { x: mapped.x, y: mapped.y };
}

function calloutRadiusForDistance(distance: number): number {
  const t = Math.min(1, distance / PROXIMITY_RADIUS);
  return MIN_CALLOUT_RADIUS + (MAX_CALLOUT_RADIUS - MIN_CALLOUT_RADIUS) * (1 - t);
}

function calloutCenter(node: SVGGraphicsElement): { cx: number; cy: number } {
  const cx = Number(node.getAttribute('cx'));
  const cy = Number(node.getAttribute('cy'));
  return { cx, cy };
}

function ensureEllipseBase(node: SVGEllipseElement) {
  if (!node.dataset.baseRx) {
    node.dataset.baseRx = node.getAttribute('rx') ?? '1.8';
    node.dataset.baseRy = node.getAttribute('ry') ?? '1.8';
  }
}

function setCalloutDisplayRadius(node: SVGGraphicsElement, displayR: number) {
  if (node instanceof SVGCircleElement) {
    node.setAttribute('r', String(displayR));
    return;
  }
  if (node instanceof SVGEllipseElement) {
    ensureEllipseBase(node);
    const baseRx = Number(node.dataset.baseRx);
    const baseRy = Number(node.dataset.baseRy);
    const baseR = Math.max(baseRx, baseRy, 0.01);
    const scale = displayR / baseR;
    node.setAttribute('rx', String(baseRx * scale));
    node.setAttribute('ry', String(baseRy * scale));
  }
}

type Props = {
  diagramId: CanonDiagramId;
  parts: CameraPart[];
  selectedId: string | null;
  onSelectPart: (id: string) => void;
};

function calloutFromTarget(target: EventTarget | null): Element | null {
  return (target as Element | null)?.closest?.(CANON_CALLOUT_DOT_SELECTOR) ?? null;
}

function manualRefFromTarget(target: EventTarget | null): number | null {
  const el = calloutFromTarget(target);
  if (!el) {
    return null;
  }
  const raw = el.getAttribute('data-manual-ref');
  if (raw == null || raw === '') {
    return null;
  }
  const ref = Number(raw);
  return Number.isFinite(ref) ? ref : null;
}

export default function CanonInteractiveDiagram({
  diagramId,
  parts,
  selectedId,
  onSelectPart,
}: Props) {
  const tooltipId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const proximityFrame = useRef<number | null>(null);
  const pointerSvgRef = useRef<{ x: number; y: number } | null>(null);
  const pointerInsideRef = useRef(false);
  const [hoveredRef, setHoveredRef] = useState<number | null>(null);

  const svgRoot = useCallback((): SVGSVGElement | null => {
    const root = frameRef.current?.querySelector('svg');
    return root instanceof SVGSVGElement ? root : null;
  }, []);

  const partByRef = useMemo(() => {
    const map = new Map<number, CameraPart>();
    for (const part of parts) {
      if (!map.has(part.manualRef)) {
        map.set(part.manualRef, part);
      }
    }
    return map;
  }, [parts]);

  const activeRef =
    hoveredRef ??
    (selectedId ? parts.find((p) => p.id === selectedId)?.manualRef ?? null : null);

  const tooltipPart = activeRef != null ? partByRef.get(activeRef) : null;

  const applyCalloutVisuals = useCallback(() => {
    const root = svgRoot();
    if (!root) {
      return;
    }
    const pointer = pointerInsideRef.current ? pointerSvgRef.current : null;
    const useProximity = pointer != null;
    const nodes = root.querySelectorAll<SVGGraphicsElement>(CANON_CALLOUT_DOT_SELECTOR);

    for (const node of nodes) {
      const rawRef = node.getAttribute('data-manual-ref');
      const mapped = rawRef != null && rawRef !== '';
      const ref = mapped ? Number(rawRef) : NaN;
      const isMapped = mapped && Number.isFinite(ref);

      if (isMapped) {
        const part = partByRef.get(ref);
        const label = part?.label ?? `Part ${ref}`;
        node.setAttribute('role', 'button');
        node.setAttribute('tabindex', '0');
        node.setAttribute('aria-label', `(${ref}) ${label}`);
      } else {
        node.removeAttribute('role');
        node.removeAttribute('tabindex');
        node.removeAttribute('aria-label');
      }

      const isActive =
        activeRef != null && Number.isFinite(ref) && activeRef === ref;
      node.setAttribute('data-active', isActive ? 'true' : 'false');

      let displayR = MIN_CALLOUT_RADIUS;
      if (isActive) {
        displayR = MAX_CALLOUT_RADIUS;
      } else if (useProximity && pointer != null) {
        const { cx, cy } = calloutCenter(node);
        const dx = pointer.x - cx;
        const dy = pointer.y - cy;
        displayR = calloutRadiusForDistance(Math.hypot(dx, dy));
      }
      setCalloutDisplayRadius(node, displayR);
    }
  }, [activeRef, partByRef, svgRoot]);

  useLayoutEffect(() => {
    applyCalloutVisuals();
  }, [applyCalloutVisuals, diagramId]);

  const scheduleProximityUpdate = useCallback(
    (clientX: number, clientY: number) => {
      const root = svgRoot();
      if (!root) {
        return;
      }
      const mapped = clientToSvg(root, clientX, clientY);
      if (!mapped) {
        return;
      }
      pointerSvgRef.current = mapped;
      if (proximityFrame.current != null) {
        return;
      }
      proximityFrame.current = window.requestAnimationFrame(() => {
        proximityFrame.current = null;
        applyCalloutVisuals();
      });
    },
    [applyCalloutVisuals],
  );

  const clearProximity = useCallback(() => {
    pointerSvgRef.current = null;
    pointerInsideRef.current = false;
    setHoveredRef(null);
    if (proximityFrame.current != null) {
      window.cancelAnimationFrame(proximityFrame.current);
      proximityFrame.current = null;
    }
    applyCalloutVisuals();
  }, [applyCalloutVisuals]);

  const onPointerEnterFrame = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      pointerInsideRef.current = true;
      scheduleProximityUpdate(event.clientX, event.clientY);
    },
    [scheduleProximityUpdate],
  );

  const onPointerMoveFrame = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      scheduleProximityUpdate(event.clientX, event.clientY);
    },
    [scheduleProximityUpdate],
  );

  const onPointerOver = useCallback((event: PointerEvent<SVGSVGElement>) => {
    const ref = manualRefFromTarget(event.target);
    if (ref != null) {
      setHoveredRef(ref);
    }
  }, []);

  const onPointerOut = useCallback((event: PointerEvent<SVGSVGElement>) => {
    const from = event.target as Element;
    const to = event.relatedTarget as Element | null;
    if (to && from.closest('[data-manual-ref]')?.contains(to)) {
      return;
    }
    if (manualRefFromTarget(from)) {
      setHoveredRef(null);
    }
  }, []);

  const onDiagramClick = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const ref = manualRefFromTarget(event.target);
      const part = ref != null ? partByRef.get(ref) : undefined;
      if (part) {
        onSelectPart(part.id);
      }
    },
    [onSelectPart, partByRef],
  );

  const onDiagramKeyDown = useCallback(
    (event: KeyboardEvent<SVGSVGElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      const ref = manualRefFromTarget(event.target);
      const part = ref != null ? partByRef.get(ref) : undefined;
      if (!part) {
        return;
      }
      event.preventDefault();
      onSelectPart(part.id);
    },
    [onSelectPart, partByRef],
  );

  const svgProps: SVGProps<SVGSVGElement> = {
    onPointerOver,
    onPointerOut,
    onClick: onDiagramClick,
    onKeyDown: onDiagramKeyDown,
    'aria-describedby': tooltipPart ? tooltipId : undefined,
  };

  return (
    <div
      className="relative h-full w-full"
    >
      {tooltipPart ? (
        <div
          id={tooltipId}
          role="tooltip"
          className={clsx(
            tooltipSurfaceClassName,
            'pointer-events-none absolute top-2 left-1/2 z-20 max-w-[min(100%,16rem)] -translate-x-1/2 px-2.5 py-1.5 text-center',
          )}
        >
          <span
            className="font-(family-name:--font-geist-mono) text-foreground/60"
          >
            ({tooltipPart.manualRef})
          </span>{' '}
          {tooltipPart.label}
        </div>
      ) : null}

      <div
        ref={frameRef}
        className="relative h-full min-h-0 w-full"
        onPointerEnter={onPointerEnterFrame}
        onPointerMove={onPointerMoveFrame}
        onPointerLeave={clearProximity}
      >
        <CanonDiagram
          id={diagramId}
          interactiveCallouts
          className={clsx(DIAGRAM_CLASS, 'h-full w-full')}
          svgProps={svgProps}
        />
      </div>
    </div>
  );
}
