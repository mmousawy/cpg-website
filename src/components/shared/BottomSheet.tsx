'use client';

import clsx from 'clsx';
import { FocusTrap } from 'focus-trap-react';
import { useEffect, useRef, useState } from 'react';

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
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isTrapped, setIsTrapped] = useState(false);
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Track if component should be rendered (delayed unmount for close animation)
  const [shouldRender, setShouldRender] = useState(false);
  // Track if animation should show open state (delayed to allow mount animation)
  const [isAnimatedOpen, setIsAnimatedOpen] = useState(false);

  // Handle mount/unmount with animation
  useEffect(() => {
    let mountTimer: ReturnType<typeof setTimeout> | undefined;
    let animationTimer: number | undefined;
    let closeAnimTimer: ReturnType<typeof setTimeout> | undefined;
    let unmountTimer: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      // First mount the component (use microtask to satisfy linter)
      mountTimer = setTimeout(() => {
        setShouldRender(true);
        // Then trigger the open animation after a frame (allows CSS transition to work)
        animationTimer = requestAnimationFrame(() => {
          setIsAnimatedOpen(true);
        });
      }, 0);
    } else {
      // First trigger close animation (use microtask to satisfy linter)
      closeAnimTimer = setTimeout(() => setIsAnimatedOpen(false), 0);
      // Then unmount after animation completes
      unmountTimer = setTimeout(() => setShouldRender(false), 300);
    }

    return () => {
      if (mountTimer) clearTimeout(mountTimer);
      if (animationTimer) cancelAnimationFrame(animationTimer);
      if (closeAnimTimer) clearTimeout(closeAnimTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
    };
  }, [isOpen]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timerId = setTimeout(() => setIsTrapped(true), 16);
      return () => clearTimeout(timerId);
    } else {
      document.body.style.overflow = '';
      const timerId = setTimeout(() => setIsTrapped(false), 0);
      return () => clearTimeout(timerId);
    }
  }, [isOpen]);

  // Reset drag state when closing
  // Reset drag state immediately on close without unnecessary rerender risk
  if (!isOpen) {
    if (startY !== null) setStartY(null);
    if (currentY !== null) setCurrentY(null);
    if (isDragging) setIsDragging(false);
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
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || startY === null) return;
    // Only prevent default when actively dragging the sheet
    e.preventDefault();
    const touch = e.touches[0];
    setCurrentY(touch.clientY);
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

  // Calculate transform based on drag
  const getTransform = () => {
    if (!isDragging || startY === null || currentY === null) return '';
    const deltaY = Math.max(0, currentY - startY);
    return `translateY(${deltaY}px)`;
  };

  // Don't render anything if not needed (prevents fixed overlay from affecting page)
  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50',
        isAnimatedOpen ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div
        className={clsx(
          'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isAnimatedOpen ? 'opacity-100' : 'opacity-0',
        )}
      />

      <FocusTrap
        active={isTrapped}
        focusTrapOptions={{
          clickOutsideDeactivates: false,
          escapeDeactivates: true,
          onDeactivate: onClose,
          fallbackFocus: () => sheetRef.current || document.body,
        }}
      >
        <div
          ref={sheetRef}
          className={clsx(
            'absolute bottom-0 left-0 right-0 flex flex-col',
            'bg-background-light rounded-t-2xl border-t border-border-color-strong shadow-xl',
            'transition-transform duration-300 ease-out',
            isAnimatedOpen ? 'translate-y-0' : 'translate-y-full',
          )}
          style={{
            maxHeight: `${maxHeight}vh`,
            height: `${maxHeight}vh`,
            transform: isDragging ? getTransform() : undefined,
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
              className="absolute right-3 top-0 shrink-0 rounded-full border border-border-color bg-background p-1.5 hover:bg-background-medium transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <CloseSVG
                className="size-4 fill-foreground"
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
    </div>
  );
}
