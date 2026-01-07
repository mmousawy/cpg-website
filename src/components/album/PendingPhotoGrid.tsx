import React from 'react';
import { DndContext, closestCenter, DragEndEvent, useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import SortablePendingPhoto from './SortablePendingPhoto';

interface PendingPhotoGridProps {
  pendingPhotos: File[]
  onDelete: (index: number) => void
  onReorder: (newPendingPhotos: File[]) => void
}

const PendingPhotoGrid: React.FC<PendingPhotoGridProps> = ({ pendingPhotos, onDelete, onReorder }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeIndex = parseInt(String(active.id).replace('pending-', ''));
    const overIndex = parseInt(String(over.id).replace('pending-', ''));
    const newPendingPhotos = arrayMove(pendingPhotos, activeIndex, overIndex);
    onReorder(newPendingPhotos);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={pendingPhotos.map((_, i) => `pending-${i}`)} strategy={rectSortingStrategy}>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {pendingPhotos.map((file, index) => (
            <SortablePendingPhoto
              key={`pending-${index}`}
              file={file}
              index={index}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default PendingPhotoGrid;
