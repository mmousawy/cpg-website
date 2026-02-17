'use client';

import type { PhotoWithAlbums } from '@/types/photos';
import BulkPhotoEditForm from './BulkPhotoEditForm';
import PhotoEditEmptyState from './PhotoEditEmptyState';
import SidebarPanel from './SidebarPanel';
import SinglePhotoEditForm from './SinglePhotoEditForm';

import type { BulkPhotoFormData } from './BulkPhotoEditForm';
import type { PhotoFormData } from './SinglePhotoEditForm';

interface PhotoEditSidebarProps {
  selectedPhotos: PhotoWithAlbums[];
  onSave: (photoId: string, data: PhotoFormData) => Promise<void>;
  onBulkSave?: (photoIds: string[], data: BulkPhotoFormData) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
  /** Handler for bulk deletion. If provided, used for multi-select delete (more efficient). */
  onBulkDelete?: (photoIds: string[]) => Promise<void>;
  /** Handler for adding photos to album. If not provided, the Album button is hidden. */
  onAddToAlbum?: (photoIds?: string[]) => void;
  /** Handler for removing photos from the current album (only shown in album view). */
  onRemoveFromAlbum?: (photoIds: string[]) => void;
  /** Handler for setting photo as album cover. If provided with currentAlbum, shows the button. */
  onSetAsCover?: (photoUrl: string, albumId: string) => Promise<void>;
  /** Current album context - used to show "Set as cover" option */
  currentAlbum?: { id: string; slug: string; cover_image_url: string | null } | null;
  isLoading?: boolean;
  /** Called when dirty state changes - parent can use this to warn before deselecting */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Ref to check if there are unsaved changes */
  isDirtyRef?: React.MutableRefObject<boolean>;
  /** External saving state (for batch operations) */
  isSaving?: boolean;
  /** Error message from parent */
  externalError?: string | null;
  /** Success state from parent */
  externalSuccess?: boolean;
  /** Hide title (when shown in parent container like BottomSheet) */
  hideTitle?: boolean;
  /** When true, only "Remove from album" is available — editing/deleting is disabled (e.g. selection includes non-owned photos) */
  readOnly?: boolean;
}

export default function PhotoEditSidebar({
  selectedPhotos,
  onSave,
  onBulkSave,
  onDelete,
  onBulkDelete,
  onAddToAlbum,
  onRemoveFromAlbum,
  onSetAsCover,
  currentAlbum,
  isLoading = false,
  onDirtyChange,
  isDirtyRef,
  isSaving: externalIsSaving = false,
  externalError = null,
  externalSuccess = false,
  hideTitle = false,
  readOnly = false,
}: PhotoEditSidebarProps) {
  const photo = selectedPhotos[0];
  const isMultiple = selectedPhotos.length > 1;

  if (!photo) {
    return (
      <SidebarPanel
        hideTitle={hideTitle}
      >
        <PhotoEditEmptyState />
      </SidebarPanel>
    );
  }

  // Multiple photos - bulk edit mode
  if (isMultiple) {
    return (
      <BulkPhotoEditForm
        selectedPhotos={selectedPhotos}
        onBulkSave={onBulkSave}
        onDelete={onDelete}
        onBulkDelete={onBulkDelete}
        onAddToAlbum={onAddToAlbum}
        onRemoveFromAlbum={onRemoveFromAlbum}
        isLoading={isLoading}
        onDirtyChange={onDirtyChange}
        isDirtyRef={isDirtyRef}
        isSaving={externalIsSaving}
        externalError={externalError}
        externalSuccess={externalSuccess}
        hideTitle={hideTitle}
        readOnly={readOnly}
      />
    );
  }

  // Single photo mode
  return (
    <SinglePhotoEditForm
      photo={photo}
      onSave={onSave}
      onDelete={onDelete}
      onAddToAlbum={onAddToAlbum}
      onRemoveFromAlbum={onRemoveFromAlbum}
      onSetAsCover={onSetAsCover}
      currentAlbum={currentAlbum}
      isLoading={isLoading}
      onDirtyChange={onDirtyChange}
      isDirtyRef={isDirtyRef}
      isSaving={externalIsSaving}
      externalError={externalError}
      externalSuccess={externalSuccess}
      hideTitle={hideTitle}
      readOnly={readOnly}
    />
  );
}

// Re-export types for backward compatibility
export type { BulkPhotoFormData } from './BulkPhotoEditForm';
export type { PhotoFormData } from './SinglePhotoEditForm';

