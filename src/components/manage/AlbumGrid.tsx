'use client';

import type { AlbumWithPhotos } from '@/types/albums';
import AlbumCard from './AlbumCard';
import SelectableGrid from './SelectableGrid';

interface AlbumGridProps {
  albums: AlbumWithPhotos[];
  selectedAlbumIds?: Set<string>;
  onAlbumClick?: (album: AlbumWithPhotos) => void;
  onAlbumDoubleClick?: (album: AlbumWithPhotos) => void;
  onSelectAlbum?: (albumId: string, isMultiSelect: boolean) => void;
  onClearSelection?: () => void;
  onSelectMultiple?: (albumIds: string[]) => void;
  className?: string;
}

export default function AlbumGrid({
  albums,
  selectedAlbumIds = new Set(),
  onAlbumClick,
  onAlbumDoubleClick,
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
        // Single click: always select (don't navigate)
        if (onSelectAlbum) {
          onSelectAlbum(id, isMulti);
        }
      }}
      onItemDoubleClick={(album) => {
        // Double click: navigate to album
        if (onAlbumDoubleClick) {
          onAlbumDoubleClick(album);
        } else if (onAlbumClick) {
          onAlbumClick(album);
        }
      }}
      onClearSelection={onClearSelection}
      onSelectMultiple={onSelectMultiple}
      className={className || 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(200px,1fr))] h-full select-none p-6 content-start'}
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
