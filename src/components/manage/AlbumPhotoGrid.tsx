'use client';

import clsx from 'clsx';
import Image from 'next/image';

import type { AlbumPhoto } from '@/types/albums';
import SelectableGrid from './SelectableGrid';

interface AlbumPhotoCardProps {
  photo: AlbumPhoto;
  isSelected: boolean;
  isDragging: boolean;
  isHovered: boolean;
}

function AlbumPhotoCard({ photo, isSelected, isDragging, isHovered }: AlbumPhotoCardProps) {
  return (
    <div
      className={clsx(
        'overflow-hidden bg-background transition-all',
        isSelected
          ? 'ring-2 ring-primary ring-offset-2'
          : isHovered
            ? 'ring-2 ring-primary/50 ring-offset-1'
            : 'hover:ring-2 hover:ring-primary/50',
        isDragging && 'opacity-50',
      )}
    >
      <div className="aspect-square overflow-hidden cursor-grab active:cursor-grabbing">
        <Image
          src={photo.photo_url}
          alt={photo.title || ''}
          width={300}
          height={300}
          className="size-full object-cover"
          draggable={false}
        />
      </div>

      {/* Caption */}
      {photo.title && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="truncate text-sm text-white">{photo.title}</p>
        </div>
      )}
    </div>
  );
}

interface AlbumPhotoGridProps {
  photos: AlbumPhoto[];
  selectedPhotoIds: Set<string>;
  onSelectPhoto: (photoId: string, isMultiSelect: boolean) => void;
  onReorder: (newPhotos: AlbumPhoto[]) => void;
  onClearSelection?: () => void;
  onSelectMultiple?: (photoIds: string[]) => void;
}

export default function AlbumPhotoGrid({
  photos,
  selectedPhotoIds,
  onSelectPhoto,
  onReorder,
  onClearSelection,
  onSelectMultiple,
}: AlbumPhotoGridProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <SelectableGrid
          items={photos}
          selectedIds={selectedPhotoIds}
          getId={(photo) => photo.id}
          onSelect={onSelectPhoto}
          onClearSelection={onClearSelection}
          onSelectMultiple={onSelectMultiple}
          onReorder={onReorder}
          sortable
          emptyMessage="No photos in this album yet. Add some photos!"
          className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(144px,1fr))] select-none p-6 h-full content-start"
          renderItem={(photo, isSelected, isDragging, isHovered) => (
            <AlbumPhotoCard
              photo={photo}
              isSelected={isSelected}
              isDragging={isDragging}
              isHovered={isHovered}
            />
          )}
        />
      </div>
    </div>
  );
}
