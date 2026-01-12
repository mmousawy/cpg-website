'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import { ModalContext } from '@/app/providers/ModalProvider';
import {
  AddPhotosToAlbumModal,
  PhotoEditSidebar,
  PhotoGrid,
  UploadingPhotoCard,
  type BulkPhotoFormData,
  type PhotoFormData,
} from '@/components/manage';
import ManageLayout from '@/components/manage/ManageLayout';
import MobileActionBar from '@/components/manage/MobileActionBar';
import BottomSheet from '@/components/shared/BottomSheet';
import Button from '@/components/shared/Button';
import DropZone from '@/components/shared/DropZone';
import PageLoading from '@/components/shared/PageLoading';
import Select from '@/components/shared/Select';
import { useUnsavedChanges } from '@/context/UnsavedChangesContext';
import { useAuth } from '@/hooks/useAuth';
import {
  useBulkUpdatePhotos,
  useDeletePhotos,
  useReorderPhotos,
  useUpdatePhoto,
} from '@/hooks/usePhotoMutations';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { usePhotos } from '@/hooks/usePhotos';
import type { PhotoWithAlbums } from '@/types/photos';
import { confirmDeletePhotos, confirmUnsavedChanges } from '@/utils/confirmHelpers';
import { preloadImages } from '@/utils/preloadImages';
import { createClient } from '@/utils/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import FolderDownMiniSVG from 'public/icons/folder-down-mini.svg';
import ImageSVG from 'public/icons/image.svg';
import PlusMiniSVG from 'public/icons/plus-mini.svg';
import TrashSVG from 'public/icons/trash.svg';

export default function PhotosPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContext = useContext(ModalContext);

  const photoEditDirtyRef = useRef(false);
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const [isMobileEditSheetOpen, setIsMobileEditSheetOpen] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [photoFilter, setPhotoFilter] = useState<'all' | 'public' | 'private'>('all');

  // React Query hooks
  const { data: photos = [], isLoading: photosLoading } = usePhotos(user?.id, photoFilter);
  const deletePhotosMutation = useDeletePhotos(user?.id, photoFilter, profile?.nickname);
  const updatePhotoMutation = useUpdatePhoto(user?.id, photoFilter, profile?.nickname);
  const bulkUpdatePhotosMutation = useBulkUpdatePhotos(user?.id, photoFilter, profile?.nickname);
  const reorderPhotosMutation = useReorderPhotos(user?.id, photoFilter);

  // Upload hook with progress tracking
  const { uploadingPhotos, uploadFiles, clearCompleted, dismissUpload } = usePhotoUpload();
  const isUploading = uploadingPhotos.some(
    (p) => p.status === 'uploading' || p.status === 'processing' || p.status === 'pending',
  );

  // Sync dirty state with global unsaved changes context
  const handleDirtyChange = useCallback(
    (isDirty: boolean) => {
      photoEditDirtyRef.current = isDirty;
      setHasUnsavedChanges(isDirty);
    },
    [setHasUnsavedChanges],
  );

  // Clear unsaved changes on unmount
  useEffect(() => {
    return () => setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  const handleConfirmUnsavedChanges = useCallback(async (): Promise<boolean> => {
    if (!photoEditDirtyRef.current) return true;
    const confirmed = await confirm(confirmUnsavedChanges());
    if (confirmed) {
      photoEditDirtyRef.current = false;
      setHasUnsavedChanges(false);
    }
    return confirmed;
  }, [confirm, setHasUnsavedChanges]);

  const handleSelectPhoto = async (photoId: string, isMultiSelect: boolean) => {
    if (!isMultiSelect && photoEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) {
      return;
    }
    setSelectedPhotoIds((prev) => {
      const newSet = new Set(prev);
      if (isMultiSelect) {
        if (newSet.has(photoId)) newSet.delete(photoId);
        else newSet.add(photoId);
      } else {
        newSet.clear();
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const handleClearSelection = async () => {
    if (photoEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) return;
    setSelectedPhotoIds(new Set());
  };

  const handleSelectMultiple = async (ids: string[]) => {
    if (photoEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) return;
    setSelectedPhotoIds(new Set(ids));
  };

  const handleSavePhoto = async (photoId: string, data: PhotoFormData) => {
    photoEditDirtyRef.current = false;
    setHasUnsavedChanges(false);
    await updatePhotoMutation.mutateAsync({ photoId, data });
  };

  const handleBulkSavePhotos = async (photoIds: string[], data: BulkPhotoFormData) => {
    photoEditDirtyRef.current = false;
    setHasUnsavedChanges(false);
    await bulkUpdatePhotosMutation.mutateAsync({ photoIds, data });
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!user) return;

    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    const storagePaths: string[] = [];
    if (photo.storage_path) {
      const pathParts = photo.storage_path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      storagePaths.push(`${user.id}/${fileName}`);
    }

    photoEditDirtyRef.current = false;
    setHasUnsavedChanges(false);

    await deletePhotosMutation.mutateAsync({ photoIds: [photoId], storagePaths });

    setSelectedPhotoIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
  };

  const handleBulkDeletePhotos = async (photoIds: string[]) => {
    if (!user || photoIds.length === 0) return;

    const photosToDelete = photos.filter((p) => photoIds.includes(p.id));
    const storagePaths = photosToDelete
      .filter((p) => p.storage_path)
      .map((p) => {
        const pathParts = p.storage_path!.split('/');
        const fileName = pathParts[pathParts.length - 1];
        return `${user.id}/${fileName}`;
      });

    photoEditDirtyRef.current = false;
    setHasUnsavedChanges(false);

    await deletePhotosMutation.mutateAsync({ photoIds, storagePaths });

    setSelectedPhotoIds(new Set());
  };

  const handleAddToAlbum = (photoIds: string[]) => {
    const photosToAdd = photos.filter((p) => photoIds.includes(p.id));
    if (photosToAdd.length === 0) return;

    modalContext.setTitle('Add to album');
    modalContext.setContent(
      <AddPhotosToAlbumModal
        photos={photosToAdd}
        onClose={() => modalContext.setIsOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['photos', user?.id, photoFilter] });
          queryClient.invalidateQueries({ queryKey: ['albums', user?.id] });
        }}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const handleReorderPhotos = async (newPhotos: PhotoWithAlbums[]) => {
    await reorderPhotosMutation.mutateAsync(newPhotos);
  };

  const handleUpload = async (files: File[]) => {
    if (!files || files.length === 0 || !user) return;

    try {
      const uploadedPhotos = await uploadFiles(files, user.id, supabase, {
        isPublic: false,
        sortOrderStart: photos.length,
      });

      // Preload images before refreshing the list to prevent layout shift
      if (uploadedPhotos.length > 0) {
        const photoUrls = uploadedPhotos.map((p) => p.url);
        await preloadImages(photoUrls);
      }

      // Refresh the list and wait for it to refetch
      await queryClient.refetchQueries({ queryKey: ['photos', user.id, photoFilter] });
      queryClient.invalidateQueries({ queryKey: ['counts', user.id] });

      // Clear completed uploads after query has refetched and images are preloaded
      clearCompleted();
    } catch (err: any) {
      console.error('Upload error:', err);
      alert(err.message || 'Failed to upload photos');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(Array.from(files));
    }
  };

  const selectedPhotos = photos.filter((p) => selectedPhotoIds.has(p.id));
  const selectedCount = selectedPhotoIds.size;

  const handleMobileEdit = () => {
    // Only open on mobile (below md breakpoint)
    if (window.matchMedia('(max-width: 767px)').matches) {
      setIsMobileEditSheetOpen(true);
    }
  };

  const handleMobileEditClose = async () => {
    if (photoEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) {
      return;
    }
    setIsMobileEditSheetOpen(false);
  };

  const handleMobileBulkDelete = async () => {
    if (selectedCount === 0) return;

    const confirmed = await confirm(confirmDeletePhotos(selectedPhotos, selectedCount));
    if (!confirmed) return;
    await handleBulkDeletePhotos(Array.from(selectedPhotoIds));
  };

  return (
    <>
      <ManageLayout
        actions={
          <>
            <Select
              value={photoFilter}
              onValueChange={(value) => setPhotoFilter(value as 'all' | 'public' | 'private')}
              options={[
                { value: 'all', label: 'All' },
                { value: 'public', label: 'Public' },
                { value: 'private', label: 'Private' },
              ]}
              fullWidth={false}
              className="min-w-[80px] md:min-w-[100px]"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              icon={<PlusMiniSVG className="size-5 -ml-0.5" />}
              variant="primary"
            >
              <span className="hidden md:inline-block">{isUploading ? 'Uploading...' : 'Upload'}</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </>
        }
        sidebar={
          <PhotoEditSidebar
            selectedPhotos={selectedPhotos}
            onSave={handleSavePhoto}
            onBulkSave={handleBulkSavePhotos}
            onDelete={handleDeletePhoto}
            onBulkDelete={handleBulkDeletePhotos}
            onAddToAlbum={handleAddToAlbum}
            isLoading={photosLoading}
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
                {selectedCount > 0 && (
                  <Button
                    onClick={() => handleAddToAlbum(Array.from(selectedPhotoIds))}
                    variant="secondary"
                    size="sm"
                    icon={<FolderDownMiniSVG className="size-5 -ml-0.5" />}
                  >
                    <span className="hidden md:inline-block">Album</span>
                  </Button>
                )}
              </>
            }
          />
        }
      >
        <DropZone
          onDrop={handleUpload}
          disabled={isUploading}
          className="flex-1 flex flex-col min-h-0"
          overlayMessage="Drop to upload"
        >
          {photosLoading ? (
            <PageLoading message="Loading photos..." />
          ) : photos.length === 0 && uploadingPhotos.length === 0 ? (
            <div className="border-2 border-dashed border-border-color p-12 text-center m-4 h-full flex flex-col items-center justify-center">
              <ImageSVG className="size-10 mb-2 inline-block" />
              <p className="mb-2 text-lg opacity-70">You don&apos;t have any photos yet</p>
              <p className="text-sm text-foreground/50 mb-4">
                Drag and drop photos here, or use the &quot;Upload&quot; button to upload photos
              </p>
              <Button onClick={() => fileInputRef.current?.click()} icon={<PlusMiniSVG className="size-5 -ml-0.5" />}>
                Upload
              </Button>
            </div>
          ) : (
            <PhotoGrid
              photos={photos}
              selectedPhotoIds={selectedPhotoIds}
              onSelectPhoto={handleSelectPhoto}
              onPhotoClick={(photo) => handleSelectPhoto(photo.id, false)}
              onClearSelection={handleClearSelection}
              onSelectMultiple={handleSelectMultiple}
              onReorder={handleReorderPhotos}
              sortable
              leadingContent={
                uploadingPhotos.length > 0 ? (
                  <>
                    {uploadingPhotos.map((upload) => (
                      <UploadingPhotoCard key={upload.id} upload={upload} onDismiss={dismissUpload} />
                    ))}
                  </>
                ) : undefined
              }
            />
          )}
        </DropZone>
      </ManageLayout>

      {/* Mobile Edit Sheet */}
      <BottomSheet isOpen={isMobileEditSheetOpen} onClose={handleMobileEditClose}>
        <PhotoEditSidebar
          selectedPhotos={selectedPhotos}
          onSave={handleSavePhoto}
          onBulkSave={handleBulkSavePhotos}
          onDelete={handleDeletePhoto}
          onBulkDelete={handleBulkDeletePhotos}
          onAddToAlbum={handleAddToAlbum}
          isLoading={photosLoading}
          onDirtyChange={handleDirtyChange}
        />
      </BottomSheet>
    </>
  );
}
