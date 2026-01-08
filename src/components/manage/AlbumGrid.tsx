'use client';

import type { AlbumWithPhotos } from '@/types/albums';
import AlbumCard from './AlbumCard';
import SelectableGrid from './SelectableGrid';

interface AlbumGridProps {
  albums: AlbumWithPhotos[];
  selectedAlbumIds?: Set<string>;
  onAlbumClick?: (album: AlbumWithPhotos) => void;
  onSelectAlbum?: (albumId: string, isMultiSelect: boolean) => void;
  onClearSelection?: () => void;
  onSelectMultiple?: (albumIds: string[]) => void;
  className?: string;
}

export default function AlbumGrid({
  albums,
  selectedAlbumIds = new Set(),
  onAlbumClick,
  onSelectAlbum,
  onClearSelection,
  onSelectMultiple,
  className,
}: AlbumGridProps) {
  return (
    <SelectableGrid
      items={albums}
      selectedIds={selectedAlbumIds}
      getId={(album) => album.id}
      onSelect={(id, isMulti) => {
        if (isMulti && onSelectAlbum) {
          onSelectAlbum(id, true);
        } else {
          const album = albums.find((a) => a.id === id);
          if (album && onAlbumClick) {
            onAlbumClick(album);
          } else if (onSelectAlbum) {
            onSelectAlbum(id, false);
          }
        }
      }}
      onClearSelection={onClearSelection}
      onSelectMultiple={onSelectMultiple}
      emptyMessage="No albums yet. Create your first album!"
      className={className || 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(200px,1fr))] h-full select-none p-6'}
      renderItem={(album, isSelected, _isDragging, isHovered) => (
        <AlbumCard
          album={album}
          isSelected={isSelected}
          isHovered={isHovered}
        />
      )}
    />
  );
}
