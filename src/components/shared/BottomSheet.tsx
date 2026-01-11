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

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timerId = setTimeout(() => setIsTrapped(true), 16);
      return () => clearTimeout(timerId);
    } else {
      document.body.style.overflow = 'auto';
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

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 transition-opacity duration-300',
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
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
          isOpen ? 'opacity-100' : 'opacity-0',
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
            isOpen ? 'translate-y-0' : 'translate-y-full',
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
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="h-1 w-12 rounded-full bg-foreground/20" />
          </div>

          {/* Header - always show close button */}
          <div className={clsx(
            'flex items-center justify-end gap-4 px-3 flex-shrink-0',
            title ? 'justify-between pb-2 border-b border-border-color' : 'absolute right-0 top-0 pt-3 z-10',
          )}>
            {title && <h2 className="text-xl font-semibold">{title}</h2>}
            <button
              className="flex-shrink-0 rounded-full border border-border-color bg-background p-1.5 hover:bg-background-medium transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <CloseSVG className="size-4 fill-foreground" />
            </button>
          </div>

          {/* Content - let children handle their own scrolling */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {children}
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
