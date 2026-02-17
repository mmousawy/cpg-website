'use client';

import clsx from 'clsx';
import { cloneElement, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  /** Content to show in the tooltip */
  content: React.ReactNode;
  /** Child element that triggers the tooltip */
  children: React.ReactElement;
  /** Position of tooltip relative to trigger */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing tooltip (ms) */
  delay?: number;
  /** Maximum width of tooltip */
  maxWidth?: string;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  maxWidth = 'max-w-xs',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    // If tooltip hasn't rendered yet, skip positioning
    if (tooltipRect.width === 0 || tooltipRect.height === 0) return;

    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top + scrollY - tooltipRect.height - 8;
        left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollY + 8;
        left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left + scrollX - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + scrollX + 8;
        break;
    }

    // Keep tooltip within viewport
    const padding = 8;
    if (left < padding) left = padding;
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }
    if (top < padding) {
      // If top doesn't fit, try bottom
      top = triggerRect.bottom + scrollY + 8;
    }
    if (top + tooltipRect.height > window.innerHeight + scrollY - padding) {
      top = triggerRect.top + scrollY - tooltipRect.height - 8;
    }

    setTooltipPosition({ top, left });
  }, [position]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  // Update position when tooltip becomes visible
  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      // Small delay to ensure tooltip is rendered before calculating position
      const timeoutId = setTimeout(() => {
        updatePosition();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isVisible, updatePosition]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isVisible) return;

    const handleUpdate = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isVisible, updatePosition]);

  const childElement = children as React.ReactElement<{ ref?: React.Ref<HTMLElement>; onMouseEnter?: (e: React.MouseEvent) => void; onMouseLeave?: (e: React.MouseEvent) => void }>;
  // Access ref from React element (React stores ref separately, not in props)
  const childRef = (childElement as { ref?: React.Ref<HTMLElement> }).ref;

  const trigger = cloneElement(childElement, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      // Forward ref to child component if it has one
      if (typeof childRef === 'function') {
        childRef(node);
      } else if (childRef && 'current' in childRef) {
        // Mutating ref.current is correct for ref forwarding - this is expected React pattern
        // eslint-disable-next-line react-hooks/immutability
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter();
      childElement.props?.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      childElement.props?.onMouseLeave?.(e);
    },
  });

  return (
    <>
      {trigger}
      {isVisible &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            className={clsx(
              'fixed z-[100] rounded-md bg-gray-900 px-2 py-1.5 text-xs text-white shadow-lg',
              maxWidth,
            )}
            style={
              tooltipPosition
                ? {
                  top: `${tooltipPosition.top}px`,
                  left: `${tooltipPosition.left}px`,
                }
                : { visibility: 'hidden' }
            }
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
