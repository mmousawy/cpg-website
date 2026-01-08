'use client';

import type { Photo } from '@/types/photos';
import PhotoCard from './PhotoCard';
import SelectableGrid from './SelectableGrid';

interface PhotoGridProps {
  photos: Photo[];
  selectedPhotoIds: Set<string>;
  onSelectPhoto: (photoId: string, isMultiSelect: boolean) => void;
  onPhotoClick?: (photo: Photo) => void;
  onClearSelection?: () => void;
  onSelectMultiple?: (photoIds: string[]) => void;
  onReorder?: (photos: Photo[]) => void;
  sortable?: boolean;
  className?: string;
}

export default function PhotoGrid({
  photos,
  selectedPhotoIds,
  onSelectPhoto,
  onPhotoClick,
  onClearSelection,
  onSelectMultiple,
  onReorder,
  sortable = false,
  className,
}: PhotoGridProps) {
  return (
    <SelectableGrid
      items={photos}
      selectedIds={selectedPhotoIds}
      getId={(photo) => photo.id}
      onSelect={(id, isMulti) => {
        if (isMulti) {
          onSelectPhoto(id, true);
        } else {
          const photo = photos.find((p) => p.id === id);
          if (photo && onPhotoClick) {
            onPhotoClick(photo);
          } else {
            onSelectPhoto(id, false);
          }
        }
      }}
      onClearSelection={onClearSelection}
      onSelectMultiple={onSelectMultiple}
      onReorder={onReorder}
      sortable={sortable}
      emptyMessage="No photos yet. Upload some photos to get started!"
      className={className}
      renderItem={(photo, isSelected, isDragging, isHovered) => (
        <PhotoCard
          photo={photo}
          isSelected={isSelected}
          isHovered={isHovered}
          isDragging={isDragging}
        />
      )}
    />
  );
}
