'use client';

import { modalOverlayZClassName } from '@/components/layout/mobileChrome';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDialogVisualViewport } from '@/hooks/useDialogVisualViewport';
import { useCloseOnRouteChange } from '@/hooks/useCloseOnRouteChange';
import { useMounted } from '@/hooks/useMounted';
import { subscribeSheetModalSuspension, sheetModalReturnRootAttr } from '@/lib/sheetModalReturn';
import { motionDuration } from '@/utils/reduceMotion';
import clsx from 'clsx';
import { FocusTrap } from 'focus-trap-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import CloseSVG from 'public/icons/close.svg';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Maximum height as a percentage of viewport (default: 90) */
  maxHeight?: number;
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = 90,
}: BottomSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const suppressBackdropDismissRef = useRef(false);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const [isTrapped, setIsTrapped] = useState(false);
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Track if component should be rendered (delayed unmount for close animation)
  const [shouldRender, setShouldRender] = useState(false);
  // Track if animation should show open state (delayed to allow mount animation)
  const [isAnimatedOpen, setIsAnimatedOpen] = useState(false);
  const mounted = useMounted();
  const [suspendedForModal, setSuspendedForModal] = useState(false);
  const [baseHeight, setBaseHeight] = useState(0);
  const [viewportTick, setViewportTick] = useState(0);
  const [dragOverlayHeight, setDragOverlayHeight] = useState(0);
  if (!shouldRender && baseHeight !== 0) {
    setBaseHeight(0);
  }

  useLayoutEffect(() => {
    if (!shouldRender) return;

    const sync = () => {
      const layoutHeight = window.innerHeight;
      setBaseHeight((prev) => (layoutHeight > prev ? layoutHeight : prev));
      setViewportTick((tick) => tick + 1);
    };

    sync();
    window.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('scroll', sync);
    };
  }, [shouldRender]);

  // Ignore backdrop dismissals right after open — the opening tap can land on the backdrop.
  useEffect(() => {
    if (!isOpen) return;

    suppressBackdropDismissRef.current = true;
    const timerId = window.setTimeout(() => {
      suppressBackdropDismissRef.current = false;
    }, 400);

    return () => clearTimeout(timerId);
  }, [isOpen]);

  const handleBackdropDismiss = () => {
    if (suppressBackdropDismissRef.current) return;
    onCloseRef.current();
  };

  // Handle mount/unmount with animation
  useEffect(() => {
    let mountTimer: ReturnType<typeof setTimeout> | undefined;
    let openAnimFrame1: number | undefined;
    let openAnimFrame2: number | undefined;
    let closeAnimTimer: ReturnType<typeof setTimeout> | undefined;
    let unmountTimer: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      // First mount the component (use microtask to satisfy linter)
      mountTimer = setTimeout(() => {
        setShouldRender(true);
        // Double rAF so the browser paints the closed state before transitioning open.
        openAnimFrame1 = requestAnimationFrame(() => {
          openAnimFrame2 = requestAnimationFrame(() => {
            setIsAnimatedOpen(true);
          });
        });
      }, 0);
    } else {
      // First trigger close animation (use microtask to satisfy linter)
      closeAnimTimer = setTimeout(() => setIsAnimatedOpen(false), 0);
      // Then unmount after animation completes
      unmountTimer = setTimeout(() => setShouldRender(false), motionDuration(200));
    }

    return () => {
      if (mountTimer) clearTimeout(mountTimer);
      if (openAnimFrame1) cancelAnimationFrame(openAnimFrame1);
      if (openAnimFrame2) cancelAnimationFrame(openAnimFrame2);
      if (closeAnimTimer) clearTimeout(closeAnimTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
    };
  }, [isOpen]);

  const presented = isOpen && !suspendedForModal;

  // Handle body scroll lock. While a modal opened from this sheet is up, the
  // sheet stays mounted but steps out of the way so closing the modal can
  // bring it back.
  useBodyScrollLock(presented);
  useDialogVisualViewport(overlayRef, presented && shouldRender, { reposition: false });
  useCloseOnRouteChange(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    return subscribeSheetModalSuspension(setSuspendedForModal);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setSuspendedForModal(false);
  }, [isOpen]);

  useEffect(() => {
    if (!presented) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCloseRef.current();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [presented]);

  // Activate the trap only after the sheet is visible — avoids spurious deactivation on reopen.
  useEffect(() => {
    if (!presented || !isAnimatedOpen) {
      const timerId = setTimeout(() => setIsTrapped(false), 0);
      return () => clearTimeout(timerId);
    }

    const timerId = setTimeout(() => setIsTrapped(true), 16);
    return () => clearTimeout(timerId);
  }, [presented, isAnimatedOpen]);

  const [dragSessionOpen, setDragSessionOpen] = useState(isOpen);
  if (isOpen !== dragSessionOpen) {
    setDragSessionOpen(isOpen);
    if (!isOpen) {
      setStartY(null);
      setCurrentY(null);
      setIsDragging(false);
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!sheetRef.current) return;

    // Don't start drag if touching an interactive element
    const target = e.target as HTMLElement;
    if (target.closest('input, button, label, select, textarea, [role="button"], [role="checkbox"]')) {
      return;
    }

    const touch = e.touches[0];
    const rect = sheetRef.current.getBoundingClientRect();
    // Only start drag if touch is near the top of the sheet (within 50px)
    if (touch.clientY - rect.top < 50) {
      setStartY(touch.clientY);
      setCurrentY(touch.clientY);
      setIsDragging(true);
      setDragOverlayHeight(overlayRef.current?.clientHeight ?? window.innerHeight);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || startY === null) return;
    // Only prevent default when actively dragging the sheet
    e.preventDefault();
    const touch = e.touches[0];
    setCurrentY(touch.clientY);
    const overlayHeight = overlayRef.current?.clientHeight;
    if (overlayHeight) setDragOverlayHeight(overlayHeight);
  };

  const handleTouchEnd = () => {
    if (!isDragging || startY === null || currentY === null || !sheetRef.current) {
      setIsDragging(false);
      return;
    }

    const deltaY = currentY - startY;
    const threshold = 100; // Minimum drag distance to close

    if (deltaY > threshold) {
      // Close the sheet
      onClose();
    }

    setStartY(null);
    setCurrentY(null);
    setIsDragging(false);
  };

  const layoutHeight = mounted ? window.innerHeight : 0;
  const visibleBottom = mounted && window.visualViewport
    ? window.visualViewport.offsetTop + window.visualViewport.height
    : layoutHeight;
  const sheetTop = baseHeight * (1 - maxHeight / 100);
  const sheetHeight = Math.max(0, Math.min(visibleBottom, layoutHeight) - sheetTop);
  void viewportTick;

  const dragDeltaY = isDragging && startY !== null && currentY !== null
    ? Math.max(0, currentY - startY)
    : 0;

  const backdropOpacity = !isOpen || !isAnimatedOpen
    ? 0
    : dragDeltaY <= 0
      ? 1
      : Math.max(
        0,
        1 - dragDeltaY / ((maxHeight / 100) * (dragOverlayHeight || layoutHeight)),
      );

  // Don't render anything if not needed (prevents fixed overlay from affecting page)
  if (!mounted || !shouldRender) {
    return null;
  }

  // Portal to body so manage layout overflow:hidden can't clip the full-viewport backdrop.
  return createPortal(
    <div
      ref={overlayRef}
      {...{ [sheetModalReturnRootAttr()]: '' }}
      aria-hidden={suspendedForModal || undefined}
      inert={suspendedForModal || undefined}
      className={clsx(
        'overlay-keyboard-root fixed inset-0',
        modalOverlayZClassName,
        isAnimatedOpen && !suspendedForModal ? 'pointer-events-auto' : 'pointer-events-none',
        suspendedForModal && 'invisible',
      )}
    >
      <div
        className={clsx(
          'absolute inset-0 bg-black/40',
          !isDragging && 'transition-opacity duration-200 ease-out',
        )}
        style={{ opacity: backdropOpacity }}
        onPointerUp={handleBackdropDismiss}
      />

      <FocusTrap
        active={isTrapped}
        focusTrapOptions={{
          clickOutsideDeactivates: false,
          escapeDeactivates: false,
          returnFocusOnDeactivate: false,
          initialFocus: false,
          preventScroll: true,
          fallbackFocus: () => sheetRef.current || document.body,
        }}
      >
        <div
          ref={sheetRef}
          className={clsx(
            'absolute left-0 right-0 flex flex-col',
            'bg-background-light rounded-t-2xl border-t border-border-color-strong shadow-xl',
            !isDragging && 'transition-transform duration-200 ease-out',
          )}
          style={{
            top: `${sheetTop}px`,
            height: `${sheetHeight}px`,
            maxHeight: `${sheetHeight}px`,
            transform: isDragging
              ? `translateY(${dragDeltaY}px)`
              : isAnimatedOpen
                ? 'translateY(0)'
                : 'translateY(100%)',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle */}
          <div
            className="flex justify-center pt-3 pb-2 shrink-0"
          >
            <div
              className="h-1 w-12 rounded-full bg-foreground/20"
            />
          </div>

          {/* Header - always show close button */}
          <div
            className={clsx(
              'relative flex items-center px-4 shrink-0',
              title ? 'pb-3 border-b border-border-color' : 'absolute right-0 top-0 pt-3 pb-2 z-10',
            )}
          >
            {title && <h2
              className="text-lg font-semibold pr-10"
            >
              {title}
            </h2>}
            <button
              className="absolute right-3 top-0 shrink-0 rounded-full border border-border-color bg-background-light p-1 hover:bg-background-medium transition-colors"
              onClick={() => onCloseRef.current()}
              aria-label="Close"
            >
              <CloseSVG
                className="size-5 fill-foreground"
              />
            </button>
          </div>

          {/* Content - let children handle their own scrolling */}
          <div
            className="flex-1 min-h-0 overflow-hidden"
          >
            {children}
          </div>
        </div>
      </FocusTrap>
    </div>,
    document.body,
  );
}
