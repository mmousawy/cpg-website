import React from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import SortablePhoto from './SortablePhoto';
import type { AlbumPhoto } from '@/types/albums';

interface AlbumPhotoGridProps {
  photos: AlbumPhoto[]
  onDelete: (photoId: string, photoUrl: string) => void
  onEditCaption: (photoId: string, currentTitle: string | null) => void
  editingPhotoId: string | null
  editingCaption: string
  onCaptionChange: (value: string) => void
  onSaveCaption: (photoId: string) => void
  onCancelEdit: () => void
  onReorder: (newPhotos: AlbumPhoto[]) => void
}

const AlbumPhotoGrid: React.FC<AlbumPhotoGridProps> = ({
  photos,
  onDelete,
  onEditCaption,
  editingPhotoId,
  editingCaption,
  onCaptionChange,
  onSaveCaption,
  onCancelEdit,
  onReorder,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    const newPhotos = arrayMove(photos, oldIndex, newIndex);
    onReorder(newPhotos);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {photos.map((photo) => {
            const {
              setNodeRef,
              attributes,
              listeners,
              isDragging,
              transform,
              transition,
            } = require('@dnd-kit/sortable').useSortable({ id: photo.id });
            const style = {
              transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
              transition,
            };
            return (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                onDelete={onDelete}
                onEditCaption={onEditCaption}
                isEditing={editingPhotoId === photo.id}
                editingCaption={editingCaption}
                onCaptionChange={onCaptionChange}
                onSaveCaption={() => onSaveCaption(photo.id)}
                onCancelEdit={onCancelEdit}
                setNodeRef={setNodeRef}
                attributes={attributes}
                listeners={listeners}
                isDragging={isDragging}
                style={style}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default AlbumPhotoGrid;
