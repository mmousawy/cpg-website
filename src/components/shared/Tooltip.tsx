'use client';

import { pageFloatingZClassName } from '@/components/layout/mobileChrome';
import { motionDuration } from '@/utils/reduceMotion';
import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_MOTION_MS = 150;

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
  delay = 16,
  maxWidth = 'max-w-xs',
}: TooltipProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef = useRef(false);

  const updatePosition = useCallback(() => {
    // The anchor is display:contents, so it has no box. Measure the child element.
    const trigger = anchorRef.current?.firstElementChild;
    if (!trigger || !tooltipRef.current) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    // If tooltip hasn't rendered yet, skip positioning
    if (tooltipRect.width === 0 || tooltipRect.height === 0) return;

    // Portaled tooltip uses `position: fixed` — use viewport coords from getBoundingClientRect()
    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + 8;
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
      top = triggerRect.bottom + 8;
    }
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = triggerRect.top - tooltipRect.height - 8;
    }

    setTooltipPosition({ top, left });
  }, [position]);

  const clearShowTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const clearExitTimer = () => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  };

  const dismiss = () => {
    if (openRef.current) return;
    clearExitTimer();
    setEntered(false);
    setIsMounted(false);
    setTooltipPosition(null);
  };

  const handleMouseEnter = (event: { buttons: number }) => {
    // A held button is a drag or click, not a hover.
    if (event.buttons !== 0) return;
    clearShowTimer();
    clearExitTimer();
    openRef.current = true;
    // Already on screen (including while fading out): reverse immediately.
    if (isMounted && tooltipPosition) {
      setEntered(true);
      return;
    }
    timeoutRef.current = setTimeout(() => {
      if (!openRef.current) return;
      setIsMounted(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    clearShowTimer();
    openRef.current = false;
    setEntered(false);
    clearExitTimer();
    const motionMs = motionDuration(TOOLTIP_MOTION_MS);
    exitTimerRef.current = setTimeout(dismiss, motionMs === 0 ? 0 : motionMs + 40);
  };

  const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'opacity') return;
    dismiss();
  };

  // Update position when tooltip becomes visible
  useEffect(() => {
    if (isMounted && tooltipRef.current) {
      // Small delay to ensure tooltip is rendered before calculating position
      const timeoutId = setTimeout(() => {
        updatePosition();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isMounted, updatePosition]);

  const placed = tooltipPosition != null;
  // Play the enter transition only after the hidden tooltip has been positioned and painted.
  useEffect(() => {
    if (!isMounted || !placed) return;
    const frame = setTimeout(() => {
      if (openRef.current) setEntered(true);
    }, 20);
    return () => clearTimeout(frame);
  }, [isMounted, placed]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isMounted) return;

    const handleUpdate = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isMounted, updatePosition]);

  // The anchor is display:contents, so mouse events are listened on the child element.
  useEffect(() => {
    const trigger = anchorRef.current?.firstElementChild;
    if (!trigger) return;

    const enter = (event: Event) => {
      if (!(event instanceof globalThis.MouseEvent)) return;
      handleMouseEnter(event);
    };
    const leave = () => {
      handleMouseLeave();
    };

    trigger.addEventListener('mouseenter', enter);
    trigger.addEventListener('mouseleave', leave);
    trigger.addEventListener('pointerdown', leave);
    return () => {
      trigger.removeEventListener('mouseenter', enter);
      trigger.removeEventListener('mouseleave', leave);
      trigger.removeEventListener('pointerdown', leave);
    };
  });

  return (
    <>
      <span
        ref={anchorRef}
        className="contents"
      >
        {children}
      </span>
      {isMounted &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            className={clsx(
              'fixed rounded-md border border-border-color-strong bg-background-float px-2 py-1.5 text-xs text-foreground shadow-[2px_4px_6px_-1px_rgba(0,0,0,0.15)] dark:shadow-[2px_4px_6px_-1px_rgba(0,0,0,0.4)]',
              'transition-[opacity,translate] duration-150 ease-out motion-reduce:transition-none',
              entered
                ? 'translate-x-0 translate-y-0 opacity-100'
                : clsx(
                  'opacity-0 motion-reduce:translate-none motion-reduce:opacity-100',
                  position === 'top' && 'translate-y-1',
                  position === 'bottom' && '-translate-y-1',
                  position === 'left' && 'translate-x-1',
                  position === 'right' && '-translate-x-1',
                ),
              pageFloatingZClassName,
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
            onTransitionEnd={handleTransitionEnd}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
