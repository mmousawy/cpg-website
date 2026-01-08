'use client';

import { useSelectionBox } from '@/hooks/useSelectionBox';
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { useCallback, useRef, useState } from 'react';

interface SelectableGridProps<T> {
  items: T[];
  selectedIds: Set<string>;
  getId: (item: T) => string;
  renderItem: (item: T, isSelected: boolean, isDragging: boolean, isHovered: boolean) => React.ReactNode;
  onSelect?: (id: string, isMultiSelect: boolean) => void;
  onClearSelection?: () => void;
  onSelectMultiple?: (ids: string[]) => void;
  onReorder?: (items: T[]) => void;
  emptyMessage?: string;
  className?: string;
  /** Enable drag-to-reorder */
  sortable?: boolean;
}

interface SortableItemProps<T> {
  item: T;
  id: string;
  isSelected: boolean;
  isHovered: boolean;
  isMultiDragging: boolean; // True if this item is part of a multi-drag (not the one being dragged directly)
  isMultiDragActive: boolean; // True if any multi-drag is happening
  pushDirection: 'left' | 'right' | null; // Direction to push this item for drop indicator
  renderItem: (item: T, isSelected: boolean, isDragging: boolean, isHovered: boolean) => React.ReactNode;
  onItemClick: (item: T, e: React.MouseEvent) => void;
  onCheckboxClick: (id: string) => void;
  sortable: boolean;
}

function SortableItem<T>({
  item,
  id,
  isSelected,
  isHovered,
  isMultiDragging,
  isMultiDragActive,
  pushDirection,
  renderItem,
  onItemClick,
  onCheckboxClick,
  sortable,
}: SortableItemProps<T>) {
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

  const style = sortable
    ? {
      transform: shouldTransform
        ? CSS.Transform.toString(transform)
        : pushTransform,
      transition: shouldTransform ? transition : customTransition,
      opacity: isBeingDragged ? 0.5 : 1,
    }
    : undefined;

  const showCheckbox = isSelected || isHovered;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-item-id={id}
      className={`relative group ${isDragging && !isMultiDragActive ? 'z-50' : ''}`}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onItemClick(item, e);
        }
      }}
      {...(sortable ? { ...attributes, ...listeners } : {})}
    >
      {/* Selection checkbox */}
      <div
        data-no-select
        className={clsx('absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded border-2 bg-background transition-all cursor-pointer',
          showCheckbox
            ? 'border-primary bg-primary text-white opacity-100 shadow-[0_0_0_1px_#0000005a]'
            : 'border-white/80 bg-white/60 opacity-0 group-hover:opacity-100 shadow-[inset_0_0_0_1px_#0000005a,0_0_0_1px_#0000005a]',
        )}
        onClick={(e) => {
          e.stopPropagation();
          onCheckboxClick(id);
        }}
      >
        {showCheckbox && (
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {renderItem(item, isSelected, isBeingDragged, isHovered)}
    </div>
  );
}

export default function SelectableGrid<T>({
  items,
  selectedIds,
  getId,
  renderItem,
  onSelect,
  onClearSelection,
  onSelectMultiple,
  onReorder,
  emptyMessage = 'No items yet.',
  className = 'grid h-full gap-3 grid-cols-[repeat(auto-fill,minmax(144px,1fr))] p-6 content-start select-none',
  sortable = false,
}: SelectableGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Track the anchor item for shift-click range selection
  const [anchorId, setAnchorId] = useState<string | null>(null);
  // Track active drag for multi-select visual feedback
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  // Track where the user is hovering for drop indicator
  const [overItemId, setOverItemId] = useState<string | null>(null);
  // Track if dropping before or after the target item
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');
  const dropPositionRef = useRef<'before' | 'after'>('before');
  // Track the visual position of the drop indicator
  const [dropIndicatorPos, setDropIndicatorPos] = useState<{ x: number; y: number; height: number } | null>(null);
  // Track which items should be pushed apart for the drop indicator
  const [pushLeftItemId, setPushLeftItemId] = useState<string | null>(null);
  const [pushRightItemId, setPushRightItemId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const getItemId = useCallback((element: Element) => {
    return element.getAttribute('data-item-id');
  }, []);

  const handleSelectionChange = useCallback(
    (selectedItemIds: string[]) => {
      if (onSelectMultiple) {
        onSelectMultiple(selectedItemIds);
      }
    },
    [onSelectMultiple],
  );

  const { isSelecting, boxStyle, hoveredIds, justFinishedSelecting } = useSelectionBox({
    containerRef,
    itemSelector: '[data-item-id]',
    onSelectionChange: handleSelectionChange,
    getItemId,
    disabled: !onSelectMultiple,
  });

  const hoveredIdSet = new Set(hoveredIds);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const updateDropIndicator = (
    overRect: { left: number; top: number; width: number; height: number },
    currentX: number,
    overId: string,
  ) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const itemCenterX = overRect.left + overRect.width / 2;
    const isAfter = currentX > itemCenterX;

    const newPosition = isAfter ? 'after' : 'before';
    setDropPosition(newPosition);
    dropPositionRef.current = newPosition;
    setOverItemId(overId);

    // Calculate indicator position relative to container
    // Center the indicator in the gap between items (gap is typically 12px)
    const gap = 12;
    const halfGap = gap / 2;
    const indicatorX = isAfter
      ? overRect.left + overRect.width - containerRect.left + halfGap
      : overRect.left - containerRect.left - halfGap;

    setDropIndicatorPos({
      x: indicatorX,
      y: overRect.top - containerRect.top,
      height: overRect.height,
    });

    // Find adjacent items to push apart (only unselected items)
    const unselectedItems = items.filter((item) => !selectedIds.has(getId(item)));
    const overIndex = unselectedItems.findIndex((item) => getId(item) === overId);

    if (isAfter) {
      // Dropping after this item: push this item left, next item right
      setPushLeftItemId(overId);
      setPushRightItemId(overIndex < unselectedItems.length - 1 ? getId(unselectedItems[overIndex + 1]) : null);
    } else {
      // Dropping before this item: push prev item left, this item right
      setPushLeftItemId(overIndex > 0 ? getId(unselectedItems[overIndex - 1]) : null);
      setPushRightItemId(overId);
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    // Only show indicator during multi-drag
    const draggedId = event.active.id as string;
    const isMultiDrag = selectedIds.has(draggedId) && selectedIds.size > 1;

    if (!isMultiDrag || !event.over || !containerRef.current) {
      setDropIndicatorPos(null);
      setPushLeftItemId(null);
      setPushRightItemId(null);
      return;
    }

    const overRect = event.over.rect;
    const pointerX = (event.activatorEvent as PointerEvent)?.clientX;

    if (overRect && pointerX !== undefined) {
      const currentX = pointerX + (event.delta?.x ?? 0);
      const overId = event.over.id as string;

      // Don't show indicator on selected items
      if (selectedIds.has(overId)) {
        setDropIndicatorPos(null);
        setPushLeftItemId(null);
        setPushRightItemId(null);
        return;
      }

      // Find the range of selected items in the full list
      const selectedIndices = items
        .map((item, index) => (selectedIds.has(getId(item)) ? index : -1))
        .filter((i) => i !== -1);

      if (selectedIndices.length > 0) {
        const minSelectedIndex = Math.min(...selectedIndices);
        const maxSelectedIndex = Math.max(...selectedIndices);
        const overIndex = items.findIndex((item) => getId(item) === overId);

        // Check if hovering on adjacent items
        const isAdjacentBefore = overIndex === minSelectedIndex - 1;
        const isAdjacentAfter = overIndex === maxSelectedIndex + 1;

        // Determine if we're on the "inner" side of an adjacent item
        const itemCenterX = overRect.left + overRect.width / 2;
        const isAfter = currentX > itemCenterX;

        // Don't allow dropping on the inner side of adjacent items
        // (right side of item before selection, or left side of item after selection)
        if ((isAdjacentBefore && isAfter) || (isAdjacentAfter && !isAfter)) {
          setDropIndicatorPos(null);
          setPushLeftItemId(null);
          setPushRightItemId(null);
          return;
        }
      }

      updateDropIndicator(
        { left: overRect.left, top: overRect.top, width: overRect.width, height: overRect.height },
        currentX,
        overId,
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const finalDropPosition = dropPositionRef.current;

    setActiveDragId(null);
    setOverItemId(null);
    setDropIndicatorPos(null);
    setPushLeftItemId(null);
    setPushRightItemId(null);

    if (!over || active.id === over.id || !onReorder) {
      return;
    }

    const draggedId = active.id as string;
    const targetId = over.id as string;

    // Check if the dragged item is part of a multi-selection
    if (selectedIds.has(draggedId) && selectedIds.size > 1) {
      // Multi-item reorder: move all selected items to the target position
      const selectedItems = items.filter((item) => selectedIds.has(getId(item)));
      const unselectedItems = items.filter((item) => !selectedIds.has(getId(item)));

      // Find the target position in the unselected items
      let targetIndex = unselectedItems.findIndex((item) => getId(item) === targetId);

      if (targetIndex === -1) {
        // Target is one of the selected items, no change needed
        return;
      }

      // Adjust for 'after' position
      if (finalDropPosition === 'after') {
        targetIndex += 1;
      }

      // Insert selected items at the target position
      const newItems = [
        ...unselectedItems.slice(0, targetIndex),
        ...selectedItems,
        ...unselectedItems.slice(targetIndex),
      ];

      onReorder(newItems);
    } else {
      // Single item reorder
      const oldIndex = items.findIndex((item) => getId(item) === draggedId);
      let newIndex = items.findIndex((item) => getId(item) === targetId);

      // Adjust for 'after' position
      if (finalDropPosition === 'after' && newIndex < items.length - 1) {
        newIndex += 1;
      }

      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setOverItemId(null);
    setDropIndicatorPos(null);
    setPushLeftItemId(null);
    setPushRightItemId(null);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border-color p-12 text-center">
        <p className="opacity-70">{emptyMessage}</p>
      </div>
    );
  }

  const handleGridClick = (e: React.MouseEvent) => {
    // Only clear selection if clicking directly on the grid (not on an item)
    // and not currently doing a drag-select or just finished one
    // and not holding a modifier key
    const hasModifier = e.shiftKey || e.metaKey || e.ctrlKey;
    if (e.target === e.currentTarget && onClearSelection && !isSelecting && !justFinishedSelecting && !hasModifier) {
      onClearSelection();
    }
  };

  const handleItemClick = (item: T, e: React.MouseEvent) => {
    const clickedId = getId(item);
    const clickedIndex = items.findIndex((i) => getId(i) === clickedId);

    if (e.shiftKey && anchorId && onSelectMultiple) {
      // Shift-click: select range from anchor to clicked item
      const anchorIndex = items.findIndex((i) => getId(i) === anchorId);
      if (anchorIndex !== -1) {
        const startIndex = Math.min(anchorIndex, clickedIndex);
        const endIndex = Math.max(anchorIndex, clickedIndex);
        const rangeIds = items.slice(startIndex, endIndex + 1).map(getId);
        onSelectMultiple(rangeIds);
      }
      // Don't update anchor on shift-click
    } else if ((e.metaKey || e.ctrlKey) && onSelect) {
      // Ctrl/Cmd-click: toggle item in selection
      onSelect(clickedId, true);
      // Update anchor to the clicked item
      setAnchorId(clickedId);
    } else if (onSelect) {
      // Regular click: select only this item
      onSelect(clickedId, false);
      // Set anchor to this item
      setAnchorId(clickedId);
    }
  };

  const handleCheckboxClick = (id: string) => {
    // Checkbox click behaves like ctrl-click: toggle without clearing others
    if (onSelect) {
      onSelect(id, true);
      setAnchorId(id);
    }
  };

  const gridContent = (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onClick={handleGridClick}
    >
      {items.map((item) => {
        const id = getId(item);
        const isSelected = selectedIds.has(id);
        const isHovered = hoveredIdSet.has(id);

        // Check if this is a multi-drag scenario
        const isMultiDragActive =
          activeDragId !== null &&
          selectedIds.has(activeDragId) &&
          selectedIds.size > 1;

        // Check if this item is part of a multi-drag (selected, but not the one being dragged directly)
        const isMultiDragging = isMultiDragActive && isSelected && activeDragId !== id;

        // Determine push direction for this item
        const pushDirection = id === pushLeftItemId
          ? 'left' as const
          : id === pushRightItemId
            ? 'right' as const
            : null;

        return (
          <SortableItem
            key={id}
            item={item}
            id={id}
            isSelected={isSelected}
            isHovered={isHovered}
            isMultiDragging={isMultiDragging}
            isMultiDragActive={isMultiDragActive}
            pushDirection={pushDirection}
            renderItem={renderItem}
            onItemClick={handleItemClick}
            onCheckboxClick={handleCheckboxClick}
            sortable={sortable}
          />
        );
      })}

      {/* Drop indicator for multi-drag */}
      {dropIndicatorPos && (
        <div
          className="pointer-events-none absolute w-1 bg-primary rounded-full z-40"
          style={{
            left: dropIndicatorPos.x - 2,
            top: dropIndicatorPos.y,
            height: dropIndicatorPos.height,
            boxShadow: '0 0 0 1px white, 0 0 0 2px rgba(0,0,0,0.1)',
          }}
        />
      )}

      {/* Selection box overlay */}
      {isSelecting && boxStyle && (
        <div
          className="pointer-events-none absolute border-2 border-primary bg-primary/10 z-50"
          style={{
            left: boxStyle.left,
            top: boxStyle.top,
            width: boxStyle.width,
            height: boxStyle.height,
          }}
        />
      )}
    </div>
  );

  // Check if we're in a multi-drag scenario for the overlay
  const isMultiDragActive =
    activeDragId !== null &&
    selectedIds.has(activeDragId) &&
    selectedIds.size > 1;

  // Get items for the drag overlay (up to 4)
  const dragOverlayItems = isMultiDragActive
    ? items.filter((item) => selectedIds.has(getId(item))).slice(0, 4)
    : activeDragId
      ? items.filter((item) => getId(item) === activeDragId)
      : [];

  const selectedCount = selectedIds.size;

  // Wrap with DndContext if sortable
  if (sortable) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={items.map((item) => getId(item))}
          strategy={rectSortingStrategy}
        >
          {gridContent}
        </SortableContext>

        <DragOverlay
          dropAnimation={null}
          modifiers={isMultiDragActive ? [snapCenterToCursor] : undefined}
        >
          {activeDragId && dragOverlayItems.length > 0 && (
            <div
              className="relative"
              style={{
                width: 120,
                height: 120,
              }}
            >
              {/* Stacked preview - up to 4 items */}
              {dragOverlayItems.map((item, index) => (
                <div
                  key={getId(item)}
                  className="absolute inset-0 overflow-hidden ring-2 ring-primary ring-offset-2"
                  style={{
                    transform: `translate(${index * 8}px, ${index * 8}px) rotate(${index * 2 - 2}deg)`,
                    zIndex: dragOverlayItems.length - index,
                  }}
                >
                  {renderItem(item, true, false, false)}
                </div>
              ))}

              {/* Item count badge */}
              {isMultiDragActive && selectedCount > 1 && (
                <div
                  className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-primary text-white text-sm font-bold shadow-lg"
                  style={{
                    zIndex: 100,
                    transform: `translate(${(Math.min(selectedCount, 4) - 1) * 8}px, 0)`,
                  }}
                >
                  {selectedCount}
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  }

  return gridContent;
}
