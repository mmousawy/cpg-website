'use client';

import { useState } from 'react';
import PhotoCard from './PhotoCard';
import type { Photo } from '@/types/photos';

interface PhotoGridProps {
  photos: Photo[];
  selectedPhotoIds: Set<string>;
  onSelectPhoto: (photoId: string, isMultiSelect: boolean) => void;
  onPhotoClick?: (photo: Photo) => void;
}

export default function PhotoGrid({
  photos,
  selectedPhotoIds,
  onSelectPhoto,
  onPhotoClick,
}: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border-color p-12 text-center">
        <p className="opacity-70">No photos yet. Upload some photos to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          isSelected={selectedPhotoIds.has(photo.id)}
          onSelect={onSelectPhoto}
          onClick={() => onPhotoClick?.(photo)}
        />
      ))}
    </div>
  );
}

