'use client';

import { useSelectionBox } from '@/hooks/useSelectionBox';
import {
  Active,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  Over,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import SortableGridItem from './SortableGridItem';

interface SelectableGridProps<T> {
  items: T[];
  selectedIds: Set<string>;
  getId: (item: T) => string;
  renderItem: (item: T, isSelected: boolean, isDragging: boolean, isHovered: boolean) => React.ReactNode;
  onSelect?: (id: string, isMultiSelect: boolean) => void;
  onClearSelection?: () => void;
  onSelectMultiple?: (ids: string[]) => void;
  onReorder?: (items: T[]) => void;
  /** Called on double-click of an item */
  onItemDoubleClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  /** Enable drag-to-reorder */
  sortable?: boolean;
  /** Always show the mobile bottom spacer (for pages with persistent bottom UI) */
  alwaysShowMobileSpacer?: boolean;
  /** Content to render before items (e.g., uploading previews for newest-first lists) */
  leadingContent?: React.ReactNode;
  /** Content to render after items (e.g., uploading previews for oldest-first lists) */
  trailingContent?: React.ReactNode;
  /** Set of item IDs that are disabled (non-selectable, no checkbox) */
  disabledIds?: Set<string>;
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
  onItemDoubleClick,
  emptyMessage = 'No items yet.',
  className = '',
  sortable = false,
  alwaysShowMobileSpacer = false,
  leadingContent,
  trailingContent,
  disabledIds,
}: SelectableGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Track the anchor item for shift-click range selection
  const [anchorId, setAnchorId] = useState<string | null>(null);
  // Track active drag for multi-select visual feedback
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  // Track if dropping before or after the target item (ref for use in drag end)
  const dropPositionRef = useRef<'before' | 'after'>('before');
  // Track the visual position of the drop indicator
  const [dropIndicatorPos, setDropIndicatorPos] = useState<{ x: number; y: number; height: number } | null>(null);
  // Track which items should be pushed apart for the drop indicator
  const [pushLeftItemId, setPushLeftItemId] = useState<string | null>(null);
  const [pushRightItemId, setPushRightItemId] = useState<string | null>(null);
  // Track actual mouse position during drag (not the grab offset)
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Track if current drag is a multi-drag for collision detection
  const isMultiDragRef = useRef(false);
  // Track if in multi-select mode (activated by long-press on mobile)
  const [isMultiSelectModeActive, setIsMultiSelectModeActive] = useState(false);
  // Multi-select mode is only active when there are selected items
  const isMultiSelectMode = isMultiSelectModeActive && selectedIds.size > 0;

  // Custom collision detection that uses pointer position for multi-drag
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    // For multi-drag, use pointerWithin so collision is based on actual cursor position
    if (isMultiDragRef.current) {
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) {
        return pointerCollisions;
      }
    }
    // Fall back to rectIntersection for single-item drag
    return rectIntersection(args);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay to distinguish tap from drag on touch devices
        tolerance: 5, // Allow 5px movement during delay
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
    (selectedItemIds: string[], isModifierKey: boolean) => {
      if (onSelectMultiple) {
        if (isModifierKey) {
          // Shift/Ctrl/Meta+drag: add to existing selection
          const newSelection = new Set(selectedIds);
          selectedItemIds.forEach((id) => newSelection.add(id));
          onSelectMultiple(Array.from(newSelection));
        } else {
          // Regular drag: replace selection
          onSelectMultiple(selectedItemIds);
        }
      }
    },
    [onSelectMultiple, selectedIds],
  );

  const { isSelecting, boxStyle, hoveredIds, justFinishedSelecting } = useSelectionBox({
    containerRef,
    itemSelector: '[data-item-id]',
    onSelectionChange: handleSelectionChange,
    getItemId,
    disabled: !onSelectMultiple,
  });

  const hoveredIdSet = new Set(hoveredIds);

  // Handle Ctrl+A / Cmd+A to select all items
  useEffect(() => {
    if (!onSelectMultiple) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+A (Windows/Linux) or Cmd+A (Mac)
      const isSelectAll = (e.ctrlKey || e.metaKey) && e.key === 'a' && !e.shiftKey;

      if (!isSelectAll) return;

      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Prevent default browser "select all text" behavior
      e.preventDefault();

      // Select all items
      const allIds = items.map((item) => getId(item));
      onSelectMultiple(allIds);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectMultiple, items, getId]);

  // Track actual mouse position during drag
  useEffect(() => {
    if (!activeDragId) return;

    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [activeDragId]);

  const handleDragStart = (event: DragStartEvent) => {
    const draggedId = event.active.id as string;
    setActiveDragId(draggedId);
    // Track if this is a multi-drag for collision detection
    isMultiDragRef.current = selectedIds.has(draggedId) && selectedIds.size > 1;
    // Initialize mouse position from the activator event
    const pointerEvent = event.activatorEvent as PointerEvent;
    if (pointerEvent) {
      mousePositionRef.current = { x: pointerEvent.clientX, y: pointerEvent.clientY };
    }
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

    dropPositionRef.current = isAfter ? 'after' : 'before';

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

    // Find the actual neighbors in the full list, only push if they're not selected
    const overIndex = items.findIndex((item) => getId(item) === overId);
    const prevItem = overIndex > 0 ? items[overIndex - 1] : null;
    const nextItem = overIndex < items.length - 1 ? items[overIndex + 1] : null;
    const prevItemId = prevItem ? getId(prevItem) : null;
    const nextItemId = nextItem ? getId(nextItem) : null;

    if (isAfter) {
      // Dropping after this item: push this item left, next item right (if not selected)
      setPushLeftItemId(overId);
      setPushRightItemId(nextItemId && !selectedIds.has(nextItemId) ? nextItemId : null);
    } else {
      // Dropping before this item: push prev item left (if not selected), this item right
      setPushLeftItemId(prevItemId && !selectedIds.has(prevItemId) ? prevItemId : null);
      setPushRightItemId(overId);
    }
  };

  const processDropIndicator = (
    event: { active: Active; over: Over | null },
  ) => {
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
    // Use the actual tracked mouse position, not the grab offset
    const currentX = mousePositionRef.current.x;

    if (overRect) {
      const overId = event.over.id as string;

      // Don't show indicator on selected items
      if (selectedIds.has(overId)) {
        setDropIndicatorPos(null);
        setPushLeftItemId(null);
        setPushRightItemId(null);
        return;
      }

      updateDropIndicator(
        { left: overRect.left, top: overRect.top, width: overRect.width, height: overRect.height },
        currentX,
        overId,
      );
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    processDropIndicator({ active: event.active, over: event.over });
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Also process on drag over to immediately show indicator when entering a new item
    processDropIndicator({ active: event.active, over: event.over });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const finalDropPosition = dropPositionRef.current;

    setActiveDragId(null);
    setDropIndicatorPos(null);
    setPushLeftItemId(null);
    setPushRightItemId(null);
    isMultiDragRef.current = false;

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
    setDropIndicatorPos(null);
    setPushLeftItemId(null);
    setPushRightItemId(null);
    isMultiDragRef.current = false;
  };

  if (items.length === 0 && !leadingContent && !trailingContent) {
    return (
      <div
        className="rounded-lg border-2 border-dashed border-border-color p-12 text-center"
      >
        <p
          className="opacity-70"
        >
          {emptyMessage}
        </p>
      </div>
    );
  }

  const handleGridClick = (e: React.MouseEvent) => {
    // Only clear selection if clicking on empty space (not on an item)
    // and not currently doing a drag-select or just finished one
    // and not holding a modifier key
    const hasModifier = e.shiftKey || e.metaKey || e.ctrlKey;

    // Check if the click target is on or inside an item
    const clickedItem = (e.target as HTMLElement).closest('[data-item-id]');
    const isClickOnItem = clickedItem !== null;

    // Also check if clicking on a checkbox (which has data-no-select attribute)
    const clickedCheckbox = (e.target as HTMLElement).closest('[data-no-select]');
    const isClickOnCheckbox = clickedCheckbox !== null;

    if (!isClickOnItem && !isClickOnCheckbox && onClearSelection && !isSelecting && !justFinishedSelecting && !hasModifier) {
      onClearSelection();
      setIsMultiSelectModeActive(false); // Exit multi-select mode when clearing
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
      className="relative h-full"
      onClick={handleGridClick}
    >
      {/* Inner grid - no height constraint so spacer works */}
      <div
        className={clsx(
          'relative grid gap-3 grid-cols-[repeat(auto-fill,minmax(144px,1fr))]',
          'p-3 md:p-6 content-start select-none',
          className,
        )}
      >
        {/* Leading content (e.g., uploading previews for newest-first lists) */}
        {leadingContent}

        {items.length === 0 && !leadingContent && !trailingContent ? (
          <div
            className="col-span-full rounded-lg border-2 border-dashed border-border-color p-12 text-center"
          >
            <p
              className="opacity-70"
            >
              {emptyMessage}
            </p>
          </div>
        ) : (
          items.map((item) => {
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
              <SortableGridItem
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
                onItemDoubleClick={onItemDoubleClick}
                onCheckboxClick={handleCheckboxClick}
                sortable={sortable}
                isMultiSelectMode={isMultiSelectMode}
                onEnterMultiSelectMode={() => setIsMultiSelectModeActive(true)}
                disabled={disabledIds?.has(id)}
              />
            );
          })
        )}

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

        {/* Trailing content (e.g., uploading previews) */}
        {trailingContent}

        {/* Spacer for mobile action bar when items are selected or always if specified */}
        {(selectedIds.size > 0 || alwaysShowMobileSpacer) && (
          <div
            className="col-span-full h-12 md:hidden"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Selection box overlay - in outer container for proper positioning */}
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
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
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
          modifiers={[snapCenterToCursor]}
        >
          {activeDragId && dragOverlayItems.length > 0 && (
            <div
              className="relative cursor-grabbing opacity-70"
              style={{
                width: 120,
                height: 120,
              }}
            >
              {/* Stacked preview - up to 4 items */}
              {dragOverlayItems.map((item, index) => (
                <div
                  key={getId(item)}
                  className="absolute inset-0 overflow-hidden ring-2 ring-primary ring-offset-2 [&_*]:!cursor-grabbing drop-shadow-[2px_2px_3px_rgba(0,0,0,0.3)]"
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
