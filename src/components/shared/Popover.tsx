'use client';

import clsx from 'clsx';
import { useEffect, useRef } from 'react';

type PopoverAlign = 'left' | 'right' | 'center';

interface PopoverProps {
  /** The trigger element (rendered inside summary) */
  trigger: React.ReactNode;
  /** The popover content */
  children: React.ReactNode;
  /** Whether the popover is disabled */
  disabled?: boolean;
  /** Horizontal alignment of popover relative to trigger */
  align?: PopoverAlign;
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
  className,
  width = 'w-64',
  open,
  onOpenChange,
}: PopoverProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

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
      onOpenChange?.(detailsRef.current.open);
    }
  };

  // Handle click on summary - needed when trigger contains interactive elements like buttons
  const handleSummaryClick = (e: React.MouseEvent) => {
    // Prevent default summary behavior, we'll handle it manually
    e.preventDefault();
    if (detailsRef.current) {
      detailsRef.current.open = !detailsRef.current.open;
      onOpenChange?.(detailsRef.current.open);
    }
  };

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <details
      ref={detailsRef}
      className="relative block"
      onToggle={handleToggle}
    >
      <summary
        className="list-none cursor-pointer [&::-webkit-details-marker]:hidden *:block"
        onClick={handleSummaryClick}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
      >
        {trigger}
      </summary>
      <div
        className={clsx(
          'absolute top-full z-35 mt-2',
          width,
          alignmentClasses[align],
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
