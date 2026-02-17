'use client';

import type { AlbumWithPhotos } from '@/types/albums';
import clsx from 'clsx';
import AlbumCard from './AlbumCard';
import LazySelectableGrid from './LazySelectableGrid';

interface AlbumGridProps {
  albums: AlbumWithPhotos[];
  selectedAlbumIds?: Set<string>;
  onAlbumClick?: (album: AlbumWithPhotos) => void;
  onAlbumDoubleClick?: (album: AlbumWithPhotos) => void;
  onSelectAlbum?: (albumId: string, isMultiSelect: boolean) => void;
  onClearSelection?: () => void;
  onSelectMultiple?: (albumIds: string[]) => void;
  className?: string;
  /** Reduce top padding (e.g. when inside a collapsible section) */
  reducedTopPadding?: boolean;
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
  reducedTopPadding = false,
}: AlbumGridProps) {
  return (
    <LazySelectableGrid
      items={albums}
      selectedIds={selectedAlbumIds}
      getId={(album) => album.id}
      onSelect={(id, isMulti) => {
        if (onSelectAlbum) {
          onSelectAlbum(id, isMulti);
        }
      }}
      onItemDoubleClick={(album) => {
        if (onAlbumDoubleClick) {
          onAlbumDoubleClick(album);
        } else if (onAlbumClick) {
          onAlbumClick(album);
        }
      }}
      onClearSelection={onClearSelection}
      onSelectMultiple={onSelectMultiple}
      emptyMessage=""
      reducedTopPadding={reducedTopPadding}
      className={clsx(
        'grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]',
        className,
      )}
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
