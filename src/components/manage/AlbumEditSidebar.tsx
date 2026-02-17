'use client';

import type { AlbumWithPhotos } from '@/types/albums';
import BulkAlbumEditForm from './BulkAlbumEditForm';
import AlbumEditEmptyState from './AlbumEditEmptyState';
import SharedAlbumEditForm from './SharedAlbumEditForm';
import SingleAlbumEditForm from './SingleAlbumEditForm';
import SidebarPanel from './SidebarPanel';

import type { AlbumFormData } from './SingleAlbumEditForm';
import type { BulkAlbumFormData } from './BulkAlbumEditForm';
import type { SharedAlbumFormData } from './SharedAlbumEditForm';

interface AlbumEditSidebarProps {
  selectedAlbums: AlbumWithPhotos[];
  /** Set to true when creating a new album (shows empty form with collapsible shared options) */
  isNewAlbum?: boolean;
  nickname?: string | null;
  onSave: (albumId: string, data: AlbumFormData | SharedAlbumFormData) => Promise<void>;
  onBulkSave?: (albumIds: string[], data: BulkAlbumFormData) => Promise<void>;
  onDelete: (albumId: string) => Promise<void>;
  onBulkDelete?: (albumIds: string[]) => Promise<void>;
  /** Handler for creating a new album */
  onCreate?: (data: AlbumFormData | SharedAlbumFormData) => Promise<void>;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  isDirtyRef?: React.MutableRefObject<boolean>;
  isSaving?: boolean;
  externalError?: string | null;
  externalSuccess?: boolean;
  /** Hide title (when shown in parent container like BottomSheet) */
  hideTitle?: boolean;
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
  hideTitle = false,
}: AlbumEditSidebarProps) {
  const album = selectedAlbums[0] ?? null;
  const isMultiple = selectedAlbums.length > 1;
  const isSharedAlbum = album?.is_shared === true;

  // New album mode (personal album form with optional collapsible shared section)
  if (isNewAlbum) {
    return (
      <SingleAlbumEditForm
        album={null}
        isNewAlbum={true}
        nickname={nickname}
        onSave={onSave as (id: string, data: AlbumFormData) => Promise<void>}
        onDelete={onDelete}
        onCreate={onCreate as (data: AlbumFormData | SharedAlbumFormData) => Promise<void>}
        isLoading={isLoading}
        onDirtyChange={onDirtyChange}
        isDirtyRef={isDirtyRef}
        isSaving={externalIsSaving}
        externalError={externalError}
        externalSuccess={externalSuccess}
        hideTitle={hideTitle}
      />
    );
  }

  // No albums selected
  if (!album) {
    return (
      <SidebarPanel
        hideTitle={hideTitle}
      >
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
        hideTitle={hideTitle}
      />
    );
  }

  // Single shared album mode
  if (isSharedAlbum && album) {
    return (
      <SharedAlbumEditForm
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
        hideTitle={hideTitle}
      />
    );
  }

  // Single album mode (personal)
  return (
    <SingleAlbumEditForm
      album={album}
      nickname={nickname}
      onSave={onSave as (id: string, data: AlbumFormData) => Promise<void>}
      onDelete={onDelete}
      isLoading={isLoading}
      onDirtyChange={onDirtyChange}
      isDirtyRef={isDirtyRef}
      isSaving={externalIsSaving}
      externalError={externalError}
      externalSuccess={externalSuccess}
      hideTitle={hideTitle}
    />
  );
}

// Re-export types for backward compatibility
export type { AlbumFormData } from './SingleAlbumEditForm';
export type { BulkAlbumFormData } from './BulkAlbumEditForm';
