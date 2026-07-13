'use client';

import clsx from 'clsx';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

type PopoverAlign = 'left' | 'right' | 'center' | 'auto';
type ResolvedPopoverAlign = 'left' | 'right' | 'center';
type PopoverSide = 'top' | 'bottom';

const VIEWPORT_EDGE_PADDING = 8;

function getAutoAlign(triggerRect: DOMRect, panelWidth: number): ResolvedPopoverAlign {
  const viewportWidth = window.innerWidth;

  const fitsRight = triggerRect.right - panelWidth >= VIEWPORT_EDGE_PADDING;
  const fitsLeft = triggerRect.left + panelWidth <= viewportWidth - VIEWPORT_EDGE_PADDING;

  if (fitsRight && !fitsLeft) {
    return 'right';
  }

  if (fitsLeft && !fitsRight) {
    return 'left';
  }

  if (fitsRight && fitsLeft) {
    const spaceOnLeft = triggerRect.right - VIEWPORT_EDGE_PADDING;
    const spaceOnRight = viewportWidth - VIEWPORT_EDGE_PADDING - triggerRect.left;
    return spaceOnLeft >= spaceOnRight ? 'right' : 'left';
  }

  const rightOverflow = Math.max(0, VIEWPORT_EDGE_PADDING - (triggerRect.right - panelWidth));
  const leftOverflow = Math.max(0, (triggerRect.left + panelWidth) - (viewportWidth - VIEWPORT_EDGE_PADDING));
  return rightOverflow <= leftOverflow ? 'right' : 'left';
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
  /** Vertical placement: 'top' = above trigger, 'bottom' = below trigger */
  side?: PopoverSide;
  /** Additional class for the popover container */
  className?: string;
  /** Width of the popover */
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

  const isOpen = open ?? internalOpen;
  const resolvedAlign: ResolvedPopoverAlign = align === 'auto' ? autoResolvedAlign : align;

  const updateAutoAlign = useCallback(() => {
    if (align !== 'auto' || !summaryRef.current || !panelRef.current) {
      return;
    }

    const triggerRect = summaryRef.current.getBoundingClientRect();
    const panelWidth = panelRef.current.getBoundingClientRect().width;

    if (panelWidth === 0) {
      return;
    }

    setAutoResolvedAlign(getAutoAlign(triggerRect, panelWidth));
  }, [align]);

  useLayoutEffect(() => {
    if (align !== 'auto' || !isOpen) {
      return;
    }

    updateAutoAlign();
    window.addEventListener('resize', updateAutoAlign);
    window.addEventListener('scroll', updateAutoAlign, true);
    return () => {
      window.removeEventListener('resize', updateAutoAlign);
      window.removeEventListener('scroll', updateAutoAlign, true);
    };
  }, [align, isOpen, updateAutoAlign]);

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
    side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <details
      ref={detailsRef}
      className="relative block overflow-visible"
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
          width,
          alignmentClasses[resolvedAlign],
          'overflow-hidden rounded-md',
          'border border-border-color bg-background-light shadow-lg',
          className,
        )}
      >
        {children}
      </div>
    </details>
  );
}
