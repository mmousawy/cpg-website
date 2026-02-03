'use client';

import GridCheckbox from '@/components/shared/GridCheckbox';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';

export interface SortableItemProps<T> {
  item: T;
  id: string;
  isSelected: boolean;
  isHovered: boolean;
  isMultiDragging: boolean; // True if this item is part of a multi-drag (not the one being dragged directly)
  isMultiDragActive: boolean; // True if any multi-drag is happening
  pushDirection: 'left' | 'right' | null; // Direction to push this item for drop indicator
  renderItem: (item: T, isSelected: boolean, isDragging: boolean, isHovered: boolean) => React.ReactNode;
  onItemClick: (item: T, e: React.MouseEvent) => void;
  onItemDoubleClick?: (item: T) => void;
  onCheckboxClick: (id: string) => void;
  sortable: boolean;
  isMultiSelectMode: boolean; // True when in multi-select mode (after first long-press)
  onEnterMultiSelectMode: () => void; // Callback to enter multi-select mode
  disabled?: boolean; // If true, item is non-selectable and checkbox is hidden
}

export default function SortableGridItem<T>({
  item,
  id,
  isSelected,
  isHovered,
  isMultiDragging,
  isMultiDragActive,
  pushDirection,
  renderItem,
  onItemClick,
  onItemDoubleClick,
  onCheckboxClick,
  sortable,
  isMultiSelectMode,
  onEnterMultiSelectMode,
  disabled = false,
}: SortableItemProps<T>) {
  const isMobile = useIsMobile();

  // Long-press detection for mobile multi-select
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const [isPressing, setIsPressing] = useState(false); // Visual feedback for long press

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !sortable });

  // Apply opacity for direct drag or multi-drag
  const isBeingDragged = isDragging || isMultiDragging;

  // For multi-drag, don't move ANY items - they all stay in place and we show a DragOverlay instead
  // Only apply transforms for single-item drag
  const shouldTransform = !isMultiDragActive;

  // Calculate push transform for making space for drop indicator
  const pushAmount = 6; // pixels to push items apart
  const pushTransform = pushDirection === 'left'
    ? `translateX(-${pushAmount}px)`
    : pushDirection === 'right'
      ? `translateX(${pushAmount}px)`
      : undefined;

  // Use dnd-kit's transition for single-item drag, custom transition for multi-drag push effect
  const customTransition = 'transform 150ms ease, opacity 150ms ease';

  // Calculate transform including long-press scale effect
  const getTransform = () => {
    const baseTransform = sortable && shouldTransform
      ? CSS.Transform.toString(transform)
      : pushTransform;

    if (isPressing) {
      // Apply scale during long-press
      return baseTransform ? `${baseTransform} scale(0.95)` : 'scale(0.95)';
    }
    return baseTransform;
  };

  const style: React.CSSProperties = {
    transform: getTransform(),
    transition: isPressing
      ? 'transform 150ms ease, opacity 150ms ease'
      : (sortable && shouldTransform ? transition : customTransition),
    opacity: isBeingDragged ? 0.5 : 1,
  };

  // On mobile, always show checkbox; on desktop, show on hover or when selected
  const showCheckbox = isMobile || isSelected || isHovered;

  // Long-press handlers for mobile (touch events only fire on touch devices)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressRef.current = false;
    setIsPressing(true); // Start visual feedback

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsPressing(false); // End visual feedback
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      // Enter multi-select mode and select this item
      onEnterMultiSelectMode();
      onCheckboxClick(id);
    }, 500); // 500ms for long press
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // Cancel long press if moved more than 10px
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setIsPressing(false);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
    setIsPressing(false);
  };

  // Prevent context menu on long press
  const handleContextMenu = (e: React.MouseEvent) => {
    // Only prevent on touch devices (context menu from long press)
    if (isLongPressRef.current || touchStartPosRef.current) {
      e.preventDefault();
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    e.stopPropagation();

    // If it was a long press, the action was already triggered - just reset and ignore
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    // In multi-select mode, taps toggle selection (like checkbox)
    if (isMultiSelectMode) {
      onCheckboxClick(id);
      return;
    }

    // Regular click/tap = single select
    onItemClick(item, e);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-item-id={id}
      className={`relative group ${isDragging && !isMultiDragActive ? 'z-50' : ''}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onDoubleClick={(e) => {
        if (!isDragging && onItemDoubleClick) {
          e.stopPropagation();
          onItemDoubleClick(item);
        }
      }}
      {...(sortable && !isMobile ? { ...attributes, ...listeners } : {})}
    >
      {/* Selection checkbox - hidden for disabled items */}
      {!disabled && (
        <GridCheckbox
          isSelected={isSelected}
          onClick={() => onCheckboxClick(id)}
          alwaysVisible={showCheckbox}
        />
      )}

      {renderItem(item, isSelected, isBeingDragged, isHovered)}
    </div>
  );
}
