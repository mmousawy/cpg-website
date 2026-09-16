'use client';

import { isPhotoSwipeOpen } from '@/utils/photoswipe';
import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react';

const LOCK_DISTANCE = 8;
/** Commit only after the pointer has moved this fraction of the swipe surface. */
const SWIPE_THRESHOLD_RATIO = 0.15;

type UseHorizontalSwipeOptions = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Pointer-start-relative dx, after the gesture locks horizontal. */
  onDrag?: (dx: number) => void;
  /** Fires on pointer down so in-flight snap-back can be frozen. */
  onGrab?: () => void;
  /** Horizontal lock released below threshold, or toward a disabled edge. */
  onCancel?: () => void;
  canSwipeLeft?: boolean;
  canSwipeRight?: boolean;
  disabled?: boolean;
};

/**
 * Horizontal swipe on an element. Vertical movement stays a page scroll.
 * After a horizontal gesture, the following click is suppressed so links don't fire.
 */
export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  onDrag,
  onGrab,
  onCancel,
  canSwipeLeft = true,
  canSwipeRight = true,
  disabled = false,
}: UseHorizontalSwipeOptions) {
  const startRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const axisLockRef = useRef<'horizontal' | 'vertical' | null>(null);
  const suppressClickRef = useRef(false);

  const resetPointer = useCallback(() => {
    startRef.current = null;
    axisLockRef.current = null;
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (disabled || event.button !== 0 || isPhotoSwipeOpen()) return;
    startRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    axisLockRef.current = null;
    suppressClickRef.current = false;
    onGrab?.();
  }, [disabled, onGrab]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const start = startRef.current;
    if (!start || event.pointerId !== start.pointerId) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (!axisLockRef.current) {
      if (Math.abs(dx) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE) return;
      axisLockRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      if (axisLockRef.current === 'horizontal') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (axisLockRef.current === 'horizontal') {
      onDrag?.(dx);
    }
  }, [onDrag]);

  const finishPointer = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const start = startRef.current;
    if (!start || event.pointerId !== start.pointerId) return;

    const dx = event.clientX - start.x;
    const wasHorizontal = axisLockRef.current === 'horizontal';
    resetPointer();

    if (!wasHorizontal || disabled || isPhotoSwipeOpen()) return;

    // Any horizontal lock is a drag, not a click (e.g. lightbox).
    suppressClickRef.current = true;

    const viewport = event.currentTarget.clientWidth || window.innerWidth;
    const threshold = viewport * SWIPE_THRESHOLD_RATIO;
    const committedLeft = dx < 0 && Math.abs(dx) >= threshold && canSwipeLeft;
    const committedRight = dx > 0 && Math.abs(dx) >= threshold && canSwipeRight;

    if (committedLeft) {
      onSwipeLeft?.();
      return;
    }
    if (committedRight) {
      onSwipeRight?.();
      return;
    }
    onCancel?.();
  }, [canSwipeLeft, canSwipeRight, disabled, onCancel, onSwipeLeft, onSwipeRight, resetPointer]);

  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }, []);

  const onDragStart = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: finishPointer,
    onPointerCancel: finishPointer,
    onClickCapture,
    onDragStart,
  };
}
