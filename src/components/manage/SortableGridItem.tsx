'use client';

import GridCheckbox from '@/components/shared/GridCheckbox';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSortable, type AnimateLayoutChanges } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { memo, useLayoutEffect, useRef } from 'react';

const animateLayoutChanges: AnimateLayoutChanges = () => false;

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
  isMultiSelectMode: boolean; // True when in multi-select mode (after checkbox tap on mobile)
  onEnterMultiSelectMode: () => void; // Callback to enter multi-select mode
  disabled?: boolean; // If true, item is non-selectable and checkbox is hidden
  isActiveDrag?: boolean; // True if this item is the one currently being dragged (from parent state, survives dnd-kit cleanup)
  /** True while box-select drag (or preview) is active — disables CSS hover styling */
  isBoxSelecting?: boolean;
}

function SortableGridItemInner<T>({
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
  isActiveDrag = false,
  isBoxSelecting = false,
}: SortableItemProps<T>) {
  const isMobile = useIsMobile();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !sortable, animateLayoutChanges });

  // Apply opacity for direct drag or multi-drag
  // isActiveDrag keeps item faded even after dnd-kit clears isDragging on drag end
  const isBeingDragged = isDragging || isMultiDragging || isActiveDrag;

  // Track previous transform to detect when dnd-kit clears a non-zero transform (drop).
  // When that happens, keep the old transform for one render so the displaced item doesn't
  // flash at its old DOM position before the reorder moves it to the new position.
  /* eslint-disable */
  const prevTransformRef = useRef(transform);
  const prevT = prevTransformRef.current;
  const hadNonZeroTransform = prevT !== null && (prevT.x !== 0 || prevT.y !== 0);
  const transformJustCleared = hadNonZeroTransform && transform === null;
  const effectiveTransform = transformJustCleared ? prevT : transform;
  // Update ref in useLayoutEffect (before paint, after render) to survive Strict Mode double-render
  useLayoutEffect(() => {
    prevTransformRef.current = transform;
  });

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

  const computedTransform = sortable && shouldTransform
    ? CSS.Translate.toString(effectiveTransform)
    : pushTransform;
  const dndTransition = transformJustCleared ? 'none' : (transform ? transition : undefined);
  const computedTransition = sortable && shouldTransform ? dndTransition : customTransition;
  const computedOpacity = isBeingDragged ? 0.5 : 1;
  /* eslint-enable */

  const style: React.CSSProperties = {
    transform: computedTransform,
    transition: computedTransition,
    opacity: computedOpacity,
  };

  // On mobile, always show checkbox; on desktop, only when committed (not during box-select preview).
  const showCheckbox = isMobile || isSelected;

  const handleContextMenu = (e: React.MouseEvent) => {
    // Prevent iOS callout / context menu from fighting long-press drag on sortable items
    if (sortable) {
      e.preventDefault();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    e.stopPropagation();

    // In multi-select mode, taps toggle selection (like checkbox)
    if (isMultiSelectMode) {
      onCheckboxClick(id);
      return;
    }

    // Regular click/tap = single select
    onItemClick(item, e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onItemClick(item, e as unknown as React.MouseEvent);
    }
  };

  const handleCheckboxClick = () => {
    if (isMobile) {
      onEnterMultiSelectMode();
    }
    onCheckboxClick(id);
  };

  const sortableProps = sortable ? { ...attributes, ...listeners } : {};
  return (
    <div
      ref={setNodeRef}
      style={style}
      data-item-id={id}
      {...sortableProps}
      role="button"
      tabIndex={0}
      className={clsx(
        'relative group outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isDragging && !isMultiDragActive && 'z-50',
        !disabled && (
          isSelected
            ? 'ring-2 ring-primary ring-offset-1 light:ring-offset-white dark:ring-offset-white/50'
            : isHovered
              ? 'ring-2 ring-primary/50 ring-offset-0 [&_.photo-card-hover-overlay]:opacity-80'
              : !isBoxSelecting && 'hover:ring-2 hover:ring-primary/50'
        ),
        isBoxSelecting && 'pointer-events-none',
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      onDoubleClick={(e) => {
        if (!isDragging && onItemDoubleClick) {
          e.stopPropagation();
          onItemDoubleClick(item);
        }
      }}
    >
      {/* Selection checkbox - hidden for disabled items */}
      {!disabled && (
        <GridCheckbox
          isSelected={isSelected}
          onClick={handleCheckboxClick}
          alwaysVisible={showCheckbox}
        />
      )}

      {renderItem(item, isSelected, isBeingDragged, isHovered)}
    </div>
  );
}

const SortableGridItem = memo(SortableGridItemInner) as typeof SortableGridItemInner;

export default SortableGridItem;
