'use client';

import { useMounted } from '@/hooks/useMounted';
import type { Photo, PhotoOwnerProfile } from '@/types/photos';
import { memo, useCallback, useMemo } from 'react';

import ManagePhotoGridSkeleton from './ManagePhotoGridSkeleton';
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
  /** Set of photo IDs that are disabled (non-selectable) */
  disabledIds?: Set<string>;
  /** Message to show for disabled photos */
  disabledMessage?: string;
  /** Set of photo IDs that were rejected (for challenge submissions) */
  rejectedIds?: Set<string>;
  /** Set of photo IDs that are pending review (for challenge submissions) */
  pendingIds?: Set<string>;
  /** Set of photo IDs that were accepted (for challenge submissions) */
  acceptedIds?: Set<string>;
  /** Map of photo IDs not owned by the current user to their owner profile (shows avatar badge) */
  notOwnedProfiles?: Map<string, PhotoOwnerProfile | null>;
  /** When true, show the grid skeleton instead of the empty state while data loads */
  isLoading?: boolean;
}

function PhotoGrid({
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
  disabledIds,
  disabledMessage,
  rejectedIds,
  pendingIds,
  acceptedIds,
  notOwnedProfiles,
  isLoading = false,
}: PhotoGridProps) {
  const mounted = useMounted();

  const fullyDisabledIds = useMemo(() => {
    const set = new Set<string>();
    disabledIds?.forEach((id) => set.add(id));
    rejectedIds?.forEach((id) => set.add(id));
    pendingIds?.forEach((id) => set.add(id));
    acceptedIds?.forEach((id) => set.add(id));
    return set;
  }, [disabledIds, rejectedIds, pendingIds, acceptedIds]);

  const allNoCheckboxIds = useMemo(() => {
    const set = new Set<string>(fullyDisabledIds);
    notOwnedProfiles?.forEach((_, id) => set.add(id));
    return set;
  }, [fullyDisabledIds, notOwnedProfiles]);

  const getId = useCallback((photo: Photo) => photo.id, []);

  const handleSelect = useCallback(
    (id: string, isMulti: boolean) => {
      if (fullyDisabledIds.has(id)) return;

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
    },
    [fullyDisabledIds, onSelectPhoto, onPhotoClick, photos],
  );

  const firstPhotoId = photos[0]?.id;

  const renderItem = useCallback(
    (photo: Photo, _isSelected: boolean, isDragging: boolean, _isHovered: boolean) => {
      const isDisabled = disabledIds?.has(photo.id) ?? false;
      const isRejected = rejectedIds?.has(photo.id) ?? false;
      const isPending = pendingIds?.has(photo.id) ?? false;
      const isAccepted = acceptedIds?.has(photo.id) ?? false;
      const isNonSelectable = isDisabled || isRejected || isPending || isAccepted;
      return (
        <PhotoCard
          photo={photo}
          tourAnchorId={photo.id === firstPhotoId ? 'photos-tour-select-photo' : undefined}
          isDragging={isDragging}
          sortable={sortable}
          albumCoverUrl={albumCoverUrl}
          currentAlbumTitle={currentAlbumTitle}
          disabled={isNonSelectable}
          disabledMessage={isDisabled ? disabledMessage : undefined}
          rejected={isRejected}
          pending={isPending}
          accepted={isAccepted}
          notOwnedProfile={notOwnedProfiles?.has(photo.id) ? (notOwnedProfiles.get(photo.id) ?? null) : undefined}
        />
      );
    },
    [
      disabledIds,
      rejectedIds,
      pendingIds,
      acceptedIds,
      sortable,
      albumCoverUrl,
      currentAlbumTitle,
      disabledMessage,
      notOwnedProfiles,
      firstPhotoId,
    ],
  );

  if (!mounted || isLoading) {
    return <ManagePhotoGridSkeleton />;
  }

  return (
    <SelectableGrid
      items={photos}
      selectedIds={selectedPhotoIds}
      getId={getId}
      onSelect={handleSelect}
      onClearSelection={onClearSelection}
      onSelectMultiple={onSelectMultiple}
      onReorder={onReorder}
      sortable={sortable}
      emptyMessage="No photos yet. Upload some photos to get started!"
      className={className}
      alwaysShowMobileSpacer={alwaysShowMobileSpacer}
      leadingContent={leadingContent}
      trailingContent={trailingContent}
      disabledIds={allNoCheckboxIds}
      renderItem={renderItem}
    />
  );
}

export default memo(PhotoGrid);
