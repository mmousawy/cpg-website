'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface UseSelectionBoxOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  itemSelector: string;
  onSelectionChange: (selectedIds: string[]) => void;
  getItemId: (element: Element) => string | null;
  disabled?: boolean;
}

export function useSelectionBox({
  containerRef,
  itemSelector,
  onSelectionChange,
  getItemId,
  disabled = false,
}: UseSelectionBoxOptions) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [hoveredIds, setHoveredIds] = useState<string[]>([]);
  const [justFinishedSelecting, setJustFinishedSelecting] = useState(false);

  // Use refs to avoid stale closures in event handlers
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const hoveredIdsRef = useRef<string[]>([]);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const getItemIdRef = useRef(getItemId);
  const itemSelectorRef = useRef(itemSelector);

  // Keep refs up to date
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    getItemIdRef.current = getItemId;
  }, [getItemId]);

  useEffect(() => {
    itemSelectorRef.current = itemSelector;
  }, [itemSelector]);

  const getBoxStyle = useCallback(() => {
    if (!selectionBox) return null;

    const left = Math.min(selectionBox.startX, selectionBox.endX);
    const top = Math.min(selectionBox.startY, selectionBox.endY);
    const width = Math.abs(selectionBox.endX - selectionBox.startX);
    const height = Math.abs(selectionBox.endY - selectionBox.startY);

    return { left, top, width, height };
  }, [selectionBox]);

  // Calculate selected items based on current selection box
  const calculateSelectedItems = useCallback(
    (box: SelectionBox): string[] => {
      if (!containerRef.current) return [];

      const container = containerRef.current;
      const items = container.querySelectorAll(itemSelectorRef.current);

      // Selection box bounds (already in container-relative coordinates)
      const boxLeft = Math.min(box.startX, box.endX);
      const boxRight = Math.max(box.startX, box.endX);
      const boxTop = Math.min(box.startY, box.endY);
      const boxBottom = Math.max(box.startY, box.endY);

      const selectedIds: string[] = [];

      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Convert item rect to container-relative coordinates (accounting for scroll)
        const itemLeft = rect.left - containerRect.left + container.scrollLeft;
        const itemRight = rect.right - containerRect.left + container.scrollLeft;
        const itemTop = rect.top - containerRect.top + container.scrollTop;
        const itemBottom = rect.bottom - containerRect.top + container.scrollTop;

        // Check if item intersects with selection box
        const intersects =
          itemLeft < boxRight &&
          itemRight > boxLeft &&
          itemTop < boxBottom &&
          itemBottom > boxTop;

        if (intersects) {
          const id = getItemIdRef.current(item);
          if (id) {
            selectedIds.push(id);
          }
        }
      });

      return selectedIds;
    },
    [containerRef],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;

      // Don't start selection if clicking on interactive elements or items
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('[data-no-select]') ||
        target.closest(itemSelectorRef.current)
      ) {
        return;
      }

      if (!container.contains(target)) return;

      const containerRect = container.getBoundingClientRect();
      const x = e.clientX - containerRect.left + container.scrollLeft;
      const y = e.clientY - containerRect.top + container.scrollTop;

      startPointRef.current = { x, y };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!startPointRef.current) return;

      const containerRect = container.getBoundingClientRect();
      const currentX = e.clientX - containerRect.left + container.scrollLeft;
      const currentY = e.clientY - containerRect.top + container.scrollTop;

      // Only start showing selection box after minimum drag distance
      const distance = Math.sqrt(
        Math.pow(currentX - startPointRef.current.x, 2) +
          Math.pow(currentY - startPointRef.current.y, 2),
      );

      if (distance < 5 && !isSelectingRef.current) return;

      if (!isSelectingRef.current) {
        isSelectingRef.current = true;
        setIsSelecting(true);
      }

      const newBox: SelectionBox = {
        startX: startPointRef.current.x,
        startY: startPointRef.current.y,
        endX: currentX,
        endY: currentY,
      };

      setSelectionBox(newBox);

      // Update hovered items in real-time
      const ids = calculateSelectedItems(newBox);
      hoveredIdsRef.current = ids;
      setHoveredIds(ids);
    };

    const handleMouseUp = () => {
      // Track if we just finished a selection (to prevent click from clearing it)
      const wasSelecting = isSelectingRef.current && hoveredIdsRef.current.length > 0;

      if (wasSelecting) {
        // Call the latest version of the callback
        onSelectionChangeRef.current(hoveredIdsRef.current);

        // Set flag to prevent the subsequent click event from clearing selection
        setJustFinishedSelecting(true);
        // Reset the flag after a short delay (after click event has fired)
        setTimeout(() => setJustFinishedSelecting(false), 0);
      }

      startPointRef.current = null;
      isSelectingRef.current = false;
      hoveredIdsRef.current = [];
      setIsSelecting(false);
      setSelectionBox(null);
      setHoveredIds([]);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [containerRef, disabled, calculateSelectedItems]);

  return {
    isSelecting,
    selectionBox,
    boxStyle: getBoxStyle(),
    hoveredIds,
    justFinishedSelecting,
  };
}
