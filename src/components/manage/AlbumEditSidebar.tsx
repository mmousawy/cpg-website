'use client';

import type { AlbumWithPhotos } from '@/types/albums';
import BulkAlbumEditForm from './BulkAlbumEditForm';
import AlbumEditEmptyState from './AlbumEditEmptyState';
import SingleAlbumEditForm from './SingleAlbumEditForm';
import SidebarPanel from './SidebarPanel';

import type { AlbumFormData } from './SingleAlbumEditForm';
import type { BulkAlbumFormData } from './BulkAlbumEditForm';

interface AlbumEditSidebarProps {
  selectedAlbums: AlbumWithPhotos[];
  /** Set to true when creating a new album (shows empty form) */
  isNewAlbum?: boolean;
  nickname?: string | null;
  onSave: (albumId: string, data: AlbumFormData) => Promise<void>;
  onBulkSave?: (albumIds: string[], data: BulkAlbumFormData) => Promise<void>;
  onDelete: (albumId: string) => Promise<void>;
  onBulkDelete?: (albumIds: string[]) => Promise<void>;
  /** Handler for creating a new album */
  onCreate?: (data: AlbumFormData) => Promise<void>;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  isDirtyRef?: React.MutableRefObject<boolean>;
  isSaving?: boolean;
  externalError?: string | null;
  externalSuccess?: boolean;
}

export default function AlbumEditSidebar({
  selectedAlbums,
  isNewAlbum = false,
  nickname,
  onSave,
  onBulkSave,
  onDelete,
  onBulkDelete,
  onCreate,
  isLoading = false,
  onDirtyChange,
  isDirtyRef,
  isSaving: externalIsSaving = false,
  externalError = null,
  externalSuccess = false,
}: AlbumEditSidebarProps) {
  const album = selectedAlbums[0] || null;
  const isMultiple = selectedAlbums.length > 1;

  // New album mode
  if (isNewAlbum) {
    return (
      <SingleAlbumEditForm
        album={null}
        isNewAlbum={true}
        nickname={nickname}
        onSave={onSave}
        onDelete={onDelete}
        onCreate={onCreate}
        isLoading={isLoading}
        onDirtyChange={onDirtyChange}
        isDirtyRef={isDirtyRef}
        isSaving={externalIsSaving}
        externalError={externalError}
        externalSuccess={externalSuccess}
      />
    );
  }

  // No albums selected
  if (!album) {
    return (
      <SidebarPanel>
        <AlbumEditEmptyState />
      </SidebarPanel>
    );
  }

  // Multiple albums - bulk edit mode
  if (isMultiple) {
    return (
      <BulkAlbumEditForm
        selectedAlbums={selectedAlbums}
        onBulkSave={onBulkSave}
        onDelete={onDelete}
        onBulkDelete={onBulkDelete}
        isLoading={isLoading}
        onDirtyChange={onDirtyChange}
        isDirtyRef={isDirtyRef}
        isSaving={externalIsSaving}
        externalError={externalError}
        externalSuccess={externalSuccess}
      />
    );
  }

  // Single album mode
  return (
    <SingleAlbumEditForm
      album={album}
      nickname={nickname}
      onSave={onSave}
      onDelete={onDelete}
      isLoading={isLoading}
      onDirtyChange={onDirtyChange}
      isDirtyRef={isDirtyRef}
      isSaving={externalIsSaving}
      externalError={externalError}
      externalSuccess={externalSuccess}
    />
  );
}

// Re-export types for backward compatibility
export type { AlbumFormData } from './SingleAlbumEditForm';
export type { BulkAlbumFormData } from './BulkAlbumEditForm';
