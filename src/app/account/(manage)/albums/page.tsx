'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import {
  AlbumEditSidebar,
  AlbumGrid,
  type AlbumFormData,
  type BulkAlbumFormData
} from '@/components/manage';
import ManageLayout from '@/components/manage/ManageLayout';
import MobileActionBar from '@/components/manage/MobileActionBar';
import BottomSheet from '@/components/shared/BottomSheet';
import Button from '@/components/shared/Button';
import PageLoading from '@/components/shared/PageLoading';
import { useUnsavedChanges } from '@/context/UnsavedChangesContext';
import {
  useBulkUpdateAlbums,
  useCreateAlbum,
  useDeleteAlbums,
  useUpdateAlbum,
} from '@/hooks/useAlbumMutations';
import { useAlbums } from '@/hooks/useAlbums';
import { useAuth } from '@/hooks/useAuth';
import { confirmDeleteAlbums, confirmUnsavedChanges } from '@/utils/confirmHelpers';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import FolderAddMiniSVG from 'public/icons/folder-add-mini.svg';
import FolderOpenMiniSVG from 'public/icons/folder-open-mini.svg';
import FolderSVG from 'public/icons/folder.svg';
import TrashSVG from 'public/icons/trash.svg';

export default function AlbumsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();

  const albumEditDirtyRef = useRef(false);
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const [isMobileEditSheetOpen, setIsMobileEditSheetOpen] = useState(false);
  const [isNewAlbum, setIsNewAlbum] = useState(false);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(new Set());

  // React Query hooks
  const { data: albums = [], isLoading: albumsLoading } = useAlbums(user?.id);
  const createAlbumMutation = useCreateAlbum(user?.id, profile?.nickname);
  const updateAlbumMutation = useUpdateAlbum(user?.id, profile?.nickname);
  const bulkUpdateAlbumsMutation = useBulkUpdateAlbums(user?.id, profile?.nickname);
  const deleteAlbumsMutation = useDeleteAlbums(user?.id, profile?.nickname);

  // Sync dirty state with global unsaved changes context
  const handleDirtyChange = useCallback(
    (isDirty: boolean) => {
      albumEditDirtyRef.current = isDirty;
      setHasUnsavedChanges(isDirty);
    },
    [setHasUnsavedChanges],
  );

  // Clear unsaved changes on unmount
  useEffect(() => {
    return () => setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  const handleConfirmUnsavedChanges = useCallback(async (): Promise<boolean> => {
    if (!albumEditDirtyRef.current) return true;
    const confirmed = await confirm(confirmUnsavedChanges());
    if (confirmed) {
      albumEditDirtyRef.current = false;
      setHasUnsavedChanges(false);
    }
    return confirmed;
  }, [confirm, setHasUnsavedChanges]);

  const handleAlbumDoubleClick = async (album: typeof albums[0]) => {
    if (!(await handleConfirmUnsavedChanges())) return;
    router.push(`/account/albums/${album.slug}`);
  };

  const handleSelectAlbum = async (albumId: string, isMultiSelect: boolean) => {
    // Check for unsaved changes when switching to a different single selection
    if (!isMultiSelect && albumEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) {
      return;
    }
    // Close new album form when selecting an existing album
    if (isNewAlbum) {
      setIsNewAlbum(false);
    }
    setSelectedAlbumIds((prev) => {
      const newSet = new Set(prev);
      if (isMultiSelect) {
        if (newSet.has(albumId)) {
          newSet.delete(albumId);
        } else {
          newSet.add(albumId);
        }
      } else {
        newSet.clear();
        newSet.add(albumId);
      }
      return newSet;
    });
  };

  const handleClearSelection = async () => {
    if (albumEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) return;
    setSelectedAlbumIds(new Set());
    // Also close new album form when clearing selection
    if (isNewAlbum) {
      setIsNewAlbum(false);
    }
  };

  const handleSelectMultiple = async (ids: string[]) => {
    if (albumEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) return;
    setSelectedAlbumIds(new Set(ids));
    // Also close new album form when selecting multiple
    if (isNewAlbum) {
      setIsNewAlbum(false);
    }
  };

  const handleCreateNewAlbum = async () => {
    // Skip confirmation if already in new album mode
    if (!isNewAlbum && !(await handleConfirmUnsavedChanges())) return;
    setSelectedAlbumIds(new Set());
    setIsNewAlbum(true);
    // Open mobile sheet for new album creation (only on mobile)
    if (window.matchMedia('(max-width: 767px)').matches) {
      setIsMobileEditSheetOpen(true);
    }
  };

  const handleCreateAlbum = async (data: AlbumFormData) => {
    albumEditDirtyRef.current = false;
    setHasUnsavedChanges(false);
    const newAlbum = await createAlbumMutation.mutateAsync(data);
    setIsNewAlbum(false);
    // Navigate to the new album
    router.push(`/account/albums/${newAlbum.slug}`);
  };

  const handleSaveAlbum = async (albumId: string, data: AlbumFormData) => {
    albumEditDirtyRef.current = false;
    setHasUnsavedChanges(false);
    await updateAlbumMutation.mutateAsync({ albumId, data });
  };

  const handleBulkSaveAlbums = async (albumIds: string[], data: BulkAlbumFormData) => {
    albumEditDirtyRef.current = false;
    setHasUnsavedChanges(false);
    await bulkUpdateAlbumsMutation.mutateAsync({ albumIds, data });
  };

  const handleDeleteAlbum = async (albumId: string) => {
    albumEditDirtyRef.current = false;
    setHasUnsavedChanges(false);

    await deleteAlbumsMutation.mutateAsync([albumId]);

    // Clear selection if deleting a selected album
    setSelectedAlbumIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(albumId);
      return newSet;
    });
  };

  const handleBulkDeleteAlbums = async (albumIds: string[]) => {
    if (albumIds.length === 0) return;

    albumEditDirtyRef.current = false;
    setHasUnsavedChanges(false);

    await deleteAlbumsMutation.mutateAsync(albumIds);

    setSelectedAlbumIds(new Set());
  };

  const selectedAlbums = albums.filter((a) => selectedAlbumIds.has(a.id));
  const selectedCount = selectedAlbumIds.size;

  const handleMobileEdit = () => {
    // Only open on mobile (below md breakpoint)
    if (window.matchMedia('(max-width: 767px)').matches) {
      setIsMobileEditSheetOpen(true);
    }
  };

  const handleMobileEditClose = async () => {
    if (albumEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) {
      return;
    }
    setIsMobileEditSheetOpen(false);
  };

  const handleMobileBulkDelete = async () => {
    if (selectedCount === 0) return;

    const confirmed = await confirm(confirmDeleteAlbums(selectedAlbums, selectedCount));
    if (!confirmed) return;
    await handleBulkDeleteAlbums(Array.from(selectedAlbumIds));
  };

  return (
    <>
      <ManageLayout
        actions={
          <Button
            onClick={handleCreateNewAlbum}
            icon={<FolderAddMiniSVG className="size-5 -ml-0.5" />}
            variant="primary"
          >
            <span className="hidden md:inline-block">New album</span>
          </Button>
        }
        sidebar={
          <AlbumEditSidebar
            selectedAlbums={selectedAlbums}
            isNewAlbum={isNewAlbum}
            nickname={profile?.nickname}
            onSave={handleSaveAlbum}
            onBulkSave={handleBulkSaveAlbums}
            onDelete={handleDeleteAlbum}
            onBulkDelete={handleBulkDeleteAlbums}
            onCreate={handleCreateAlbum}
            isLoading={albumsLoading}
            onDirtyChange={handleDirtyChange}
          />
        }
        mobileActionBar={
          <MobileActionBar
            selectedCount={selectedCount}
            onEdit={handleMobileEdit}
            onClearSelection={handleClearSelection}
            actions={
              <>
                {selectedCount > 0 && (
                  <Button
                    onClick={handleMobileBulkDelete}
                    variant="danger"
                    size="sm"
                    icon={<TrashSVG className="size-5 -ml-0.5" />}
                  >
                    <span className="hidden md:inline-block">Delete</span>
                  </Button>
                )}
                {selectedCount === 1 && (
                  <Button
                    onClick={() => {
                      const album = selectedAlbums[0];
                      if (album) router.push(`/account/albums/${album.slug}`);
                    }}
                    variant="secondary"
                    size="sm"
                    icon={<FolderOpenMiniSVG className="size-5 -ml-0.5" />}
                  >
                    <span className="hidden md:inline-block">Open</span>
                  </Button>
                )}
              </>
            }
          />
        }
      >
        {albumsLoading ? (
          <PageLoading message="Loading albums..." />
        ) : albums.length === 0 ? (
          <div className="border-2 border-dashed border-border-color p-12 text-center m-4 h-full flex flex-col items-center justify-center">
            <FolderSVG className="size-10 mb-2 inline-block" />
            <p className="mb-2 text-lg opacity-70">You don&apos;t have any albums yet</p>
            <p className="text-sm text-foreground/50 mb-4">
              Use the &quot;New album&quot; button to create a new album
            </p>
            <Button onClick={handleCreateNewAlbum} icon={<FolderAddMiniSVG className="size-5 -ml-0.5" />}>
              New album
            </Button>
          </div>
        ) : (
          <AlbumGrid
            albums={albums}
            selectedAlbumIds={selectedAlbumIds}
            onAlbumDoubleClick={handleAlbumDoubleClick}
            onSelectAlbum={handleSelectAlbum}
            onClearSelection={handleClearSelection}
            onSelectMultiple={handleSelectMultiple}
          />
        )}
      </ManageLayout>

      {/* Mobile Edit Sheet */}
      <BottomSheet isOpen={isMobileEditSheetOpen} onClose={handleMobileEditClose}>
        <AlbumEditSidebar
          selectedAlbums={selectedAlbums}
          isNewAlbum={isNewAlbum}
          nickname={profile?.nickname}
          onSave={handleSaveAlbum}
          onBulkSave={handleBulkSaveAlbums}
          onDelete={handleDeleteAlbum}
          onBulkDelete={handleBulkDeleteAlbums}
          onCreate={handleCreateAlbum}
          isLoading={albumsLoading}
          onDirtyChange={handleDirtyChange}
        />
      </BottomSheet>
    </>
  );
}
