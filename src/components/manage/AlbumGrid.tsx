'use client';

import AlbumGridSkeleton from '@/components/album/AlbumGridSkeleton';
import type { AlbumWithPhotos } from '@/types/albums';
import { useMounted } from '@/hooks/useMounted';
import clsx from 'clsx';

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
  /** Reduce top padding (e.g. when inside a collapsible section) */
  reducedTopPadding?: boolean;
  /** Album ID currently being opened (shows loading overlay on that card) */
  openingAlbumId?: string | null;
}

const albumGridClassName =
  'grid gap-3 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]';

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
  openingAlbumId = null,
}: AlbumGridProps) {
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div
        className={clsx('p-3 md:p-6', reducedTopPadding && 'pt-0')}
      >
        <AlbumGridSkeleton
          count={albums.length > 0 ? Math.min(albums.length, 8) : 6}
          className={clsx(albumGridClassName, className)}
        />
      </div>
    );
  }

  return (
    <SelectableGrid
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
          isOpening={album.id === openingAlbumId}
        />
      )}
    />
  );
}
