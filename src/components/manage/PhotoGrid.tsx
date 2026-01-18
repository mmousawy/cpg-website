'use client';

import type { Photo } from '@/types/photos';
import PhotoCard from './PhotoCard';
import LazySelectableGrid from './LazySelectableGrid';

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
  /** Always show the mobile bottom spacer (for pages with persistent bottom UI) */
  alwaysShowMobileSpacer?: boolean;
  /** Content to render before photos (e.g., uploading previews for newest-first lists) */
  leadingContent?: React.ReactNode;
  /** Content to render after photos (e.g., uploading previews for oldest-first lists) */
  trailingContent?: React.ReactNode;
  /** URL of the album cover image (if photos are in album context) */
  albumCoverUrl?: string | null;
  /** Current album title (if viewing in album context) */
  currentAlbumTitle?: string | null;
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
  alwaysShowMobileSpacer = false,
  leadingContent,
  trailingContent,
  albumCoverUrl,
  currentAlbumTitle,
}: PhotoGridProps) {
  return (
    <LazySelectableGrid
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
      alwaysShowMobileSpacer={alwaysShowMobileSpacer}
      leadingContent={leadingContent}
      trailingContent={trailingContent}
      renderItem={(photo, isSelected, isDragging, isHovered) => (
        <PhotoCard
          photo={photo}
          isSelected={isSelected}
          isHovered={isHovered}
          isDragging={isDragging}
          albumCoverUrl={albumCoverUrl}
          currentAlbumTitle={currentAlbumTitle}
        />
      )}
    />
  );
}
