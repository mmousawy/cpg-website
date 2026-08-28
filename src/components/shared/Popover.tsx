'use client';

import clsx from 'clsx';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { subscribeRouteChange } from '@/lib/routeChange';

type PopoverAlign = 'left' | 'right' | 'center' | 'auto';
type ResolvedPopoverAlign = 'left' | 'right' | 'center';
type PopoverSide = 'top' | 'bottom' | 'auto';
type ResolvedPopoverSide = 'top' | 'bottom';

const VIEWPORT_EDGE_PADDING = 8;
const VIEWPORT_BOTTOM_SAFE_AREA = 80;
const VIEWPORT_RIGHT_SAFE_AREA = 80;
const POPOVER_GAP = 8;

function getAutoAlign(triggerRect: DOMRect, panelWidth: number): ResolvedPopoverAlign {
  const viewportWidth = window.innerWidth;
  const rightLimit = viewportWidth - VIEWPORT_RIGHT_SAFE_AREA;
  const wouldClipRight = triggerRect.left + panelWidth > rightLimit;

  if (!wouldClipRight) {
    return 'left';
  }

  const fitsRight = triggerRect.right - panelWidth >= VIEWPORT_EDGE_PADDING;
  return fitsRight ? 'right' : 'left';
}

function getAutoSide(triggerRect: DOMRect, panelHeight: number): ResolvedPopoverSide {
  const viewportHeight = window.innerHeight;
  const bottomLimit = viewportHeight - VIEWPORT_BOTTOM_SAFE_AREA;
  const wouldClipBelow = triggerRect.bottom + POPOVER_GAP + panelHeight > bottomLimit;

  if (!wouldClipBelow) {
    return 'bottom';
  }

  const fitsAbove = triggerRect.top - POPOVER_GAP - panelHeight >= VIEWPORT_EDGE_PADDING;
  return fitsAbove ? 'top' : 'bottom';
}

interface PopoverProps {
  /** The trigger element (rendered inside summary) */
  trigger: React.ReactNode;
  /** The popover content */
  children: React.ReactNode;
  /** Whether the popover is disabled */
  disabled?: boolean;
  /** Horizontal alignment of popover relative to trigger. `auto` picks left/right from viewport space. */
  align?: PopoverAlign;
  /** Vertical placement: `top` = above trigger, `bottom` = below trigger, `auto` picks from viewport space. */
  side?: PopoverSide;
  /** Additional class for the popover container */
  className?: string;
  /** Width of the popover. Use `trigger` to match the trigger width and grow only if content is wider. */
  width?: string;
  /** Whether the popover is controlled externally */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

/**
 * A simple popover component using the native details/summary pattern.
 * No portals or manual positioning needed - uses CSS for positioning.
 *
 * @example
 * <Popover
 *   trigger={<button>Click me</button>}
 *   align="left"
 * >
 *   <div>Popover content</div>
 * </Popover>
 */
export default function Popover({
  trigger,
  children,
  disabled,
  align = 'left',
  side = 'bottom',
  className,
  width = 'w-64',
  open,
  onOpenChange,
}: PopoverProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [autoResolvedAlign, setAutoResolvedAlign] = useState<ResolvedPopoverAlign>('left');
  const [autoResolvedSide, setAutoResolvedSide] = useState<ResolvedPopoverSide>('bottom');
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const isOpen = open ?? internalOpen;
  const resolvedAlign: ResolvedPopoverAlign = align === 'auto' ? autoResolvedAlign : align;
  const resolvedSide: ResolvedPopoverSide = side === 'auto' ? autoResolvedSide : side;

  const updateAutoPlacement = useCallback(() => {
    if ((align !== 'auto' && side !== 'auto') || !summaryRef.current || !panelRef.current) {
      return;
    }

    const triggerRect = summaryRef.current.getBoundingClientRect();
    const panelRect = panelRef.current.getBoundingClientRect();

    if (panelRect.width === 0 || panelRect.height === 0) {
      return;
    }

    if (align === 'auto') {
      setAutoResolvedAlign(getAutoAlign(triggerRect, panelRect.width));
    }

    if (side === 'auto') {
      setAutoResolvedSide(getAutoSide(triggerRect, panelRect.height));
    }
  }, [align, side]);

  useLayoutEffect(() => {
    if ((align !== 'auto' && side !== 'auto') || !isOpen) {
      return;
    }

    updateAutoPlacement();
    window.addEventListener('resize', updateAutoPlacement);
    window.addEventListener('scroll', updateAutoPlacement, true);
    return () => {
      window.removeEventListener('resize', updateAutoPlacement);
      window.removeEventListener('scroll', updateAutoPlacement, true);
    };
  }, [align, side, isOpen, updateAutoPlacement]);

  useLayoutEffect(() => {
    return subscribeRouteChange(() => {
      if (!detailsRef.current?.open) return;
      detailsRef.current.open = false;
      setInternalOpen(false);
      onOpenChangeRef.current?.(false);
    });
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        detailsRef.current.open = false;
        onOpenChange?.(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onOpenChange]);

  // Sync controlled state
  useEffect(() => {
    if (open !== undefined && detailsRef.current) {
      detailsRef.current.open = open;
    }
  }, [open]);

  // Handle toggle events for controlled mode
  const handleToggle = () => {
    if (detailsRef.current) {
      setInternalOpen(detailsRef.current.open);
      onOpenChange?.(detailsRef.current.open);
    }
  };

  // Handle click on summary - needed when trigger contains interactive elements like buttons
  const handleSummaryClick = (e: React.MouseEvent) => {
    // Prevent default summary behavior, we'll handle it manually
    e.preventDefault();
    if (detailsRef.current) {
      detailsRef.current.open = !detailsRef.current.open;
      setInternalOpen(detailsRef.current.open);
      onOpenChange?.(detailsRef.current.open);
    }
  };

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  const sideClasses =
    resolvedSide === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  const isTriggerWidth = width === 'trigger';
  const widthClasses = isTriggerWidth ? 'w-max min-w-full' : width;

  return (
    <details
      ref={detailsRef}
      className={clsx(
        'relative overflow-visible',
        isTriggerWidth ? 'inline-block w-fit' : 'inline-block',
      )}
      onToggle={handleToggle}
    >
      <summary
        ref={summaryRef}
        className="list-none cursor-pointer [&::-webkit-details-marker]:hidden *:block"
        onClick={handleSummaryClick}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
      >
        {trigger}
      </summary>
      <div
        ref={panelRef}
        className={clsx(
          'absolute z-50',
          sideClasses,
          widthClasses,
          alignmentClasses[resolvedAlign],
          'overflow-hidden rounded-md',
          'border border-border-color bg-background-light bg-no-noise shadow-lg',
          className,
        )}
      >
        {children}
      </div>
    </details>
  );
}
