'use client';

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';

import GearItemRow from '@/components/gear/GearItemRow';
import type { UserGearItem } from '@/lib/gear/types';
import DragHandleSVG from 'public/icons/drag-handle.svg';

type GearSortableListProps = {
  items: UserGearItem[];
  isOwner: boolean;
  embedded?: boolean;
  showCategory?: boolean;
  listClassName?: string;
  onReorder: (items: UserGearItem[]) => void;
  onEdit: (item: UserGearItem) => void;
  onRemove: (item: UserGearItem) => void;
};

function SortableGearRow({
  item,
  isOwner,
  embedded,
  showCategory,
  onEdit,
  onRemove,
}: {
  item: UserGearItem;
  isOwner: boolean;
  embedded?: boolean;
  showCategory?: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isOwner });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        isDragging && 'relative z-10 bg-background-light/80 bg-no-noise rounded-lg shadow-md/10',
        embedded && 'border-b border-border-color last:border-b-0',
      )}
    >
      <div
        className={clsx('flex items-start gap-1 py-0.5', isOwner && 'px-3')}
      >
        {isOwner && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className={clsx(
              'mt-2.5 shrink-0 touch-none rounded p-1',
              'cursor-grab active:cursor-grabbing',
              'bg-transparent text-foreground/60',
              'hover:bg-foreground/10 hover:text-foreground/70',
            )}
            aria-label={`Reorder ${item.name}`}
            {...attributes}
            {...listeners}
          >
            <DragHandleSVG
              className="size-6 fill-foreground/45"
              aria-hidden
            />
          </button>
        )}
        <div
          className="min-w-0 flex-1"
        >
          <GearItemRow
            item={item}
            isOwner={isOwner}
            embedded={embedded}
            embeddedDivider={!embedded}
            showCategory={showCategory}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        </div>
      </div>
    </div>
  );
}

export default function GearSortableList({
  items,
  isOwner,
  embedded,
  showCategory,
  listClassName,
  onReorder,
  onEdit,
  onRemove,
}: GearSortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className={listClassName}
        >
          {items.map((item) => (
            <SortableGearRow
              key={item.id}
              item={item}
              isOwner={isOwner}
              embedded={embedded}
              showCategory={showCategory}
              onEdit={() => onEdit(item)}
              onRemove={() => onRemove(item)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
