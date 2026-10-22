'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import { ModalContext } from '@/app/providers/ModalProvider';
import {
  AddPhotosToAlbumModal,
  FilterPhotosModal,
  PhotoEditSidebar,
  PhotoGrid,
  UploadingPhotoCard,
  type BulkPhotoFormData,
  type PhotoFormData,
} from '@/components/manage';
import ManageLayout from '@/components/manage/ManageLayout';
import ManagePhotoGridSkeleton from '@/components/manage/ManagePhotoGridSkeleton';
import ManageSidebarSkeleton from '@/components/manage/ManageSidebarSkeleton';
import MobileActionBar from '@/components/manage/MobileActionBar';
import BottomSheet from '@/components/shared/BottomSheet';
import Button from '@/components/shared/Button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import DropZone from '@/components/shared/DropZone';
import EmptyState from '@/components/shared/EmptyState';
import HelpLink from '@/components/shared/HelpLink';
import { useManageScrollContainer } from '@/context/ManageScrollContext';
import { useUnsavedChanges } from '@/context/UnsavedChangesContext';
import { useManagePhotoDeepLink } from '@/hooks/useManagePhotoDeepLink';
import {
  countActivePhotoLibraryFilters,
  EMPTY_PHOTO_LIBRARY_FILTERS,
  isPhotoLibraryFiltersActive,
  type PhotoLibraryFilters,
} from '@/hooks/photoLibraryFilters';
import {
  clearPersistedPhotoLibraryFilters,
  loadPersistedPhotoLibraryFilters,
  persistPhotoLibraryFilters,
} from '@/hooks/photoLibraryFiltersStorage';
import { photosQueryFilterKey, setAllPhotosQueriesFromFlat } from '@/hooks/photoQueryCache';
import { useAuth } from '@/hooks/useAuth';
import { photoLibraryFilterOptionsQueryKey } from '@/hooks/usePhotoLibraryFilterOptions';
import { photoCountQueryKey, usePhotoCount } from '@/hooks/usePhotoCounts';
import {
  useBulkUpdatePhotos,
  useDeletePhotos,
  useReorderPhotos,
  useUpdatePhoto,
} from '@/hooks/usePhotoMutations';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { usePhotos } from '@/hooks/usePhotos';
import { usePhotosFirstRunTour } from '@/hooks/usePhotosFirstRunTour';
import { useSupabase } from '@/hooks/useSupabase';
import {
  isPhotosManageTourMockMode,
  isPhotosTourMockMode,
} from '@/tours/photosFirstRunTour.constants';
import type { PhotoWithAlbums } from '@/types/photos';
import { confirmDeletePhotos, confirmUnsavedChanges } from '@/utils/confirmHelpers';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  Suspense,
  startTransition,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import FilterSVG from 'public/icons/filter.svg';
import FolderDownMiniSVG from 'public/icons/folder-down-mini.svg';
import ImageSVG from 'public/icons/image.svg';
import PlusMiniSVG from 'public/icons/plus-mini.svg';
import TrashSVG from 'public/icons/trash.svg';

export default function PhotosPage() {
  return (
    <Suspense
      fallback={<PhotosPageLoadingFallback />}
    >
      <PhotosPageContent />
    </Suspense>
  );
}

function PhotosPageLoadingFallback() {
  return (
    <ManageLayout
      sidebar={<ManageSidebarSkeleton />}
    >
      <ManagePhotoGridSkeleton />
    </ManageLayout>
  );
}

function ManageScrollContainerBridge({
  targetRef,
}: {
  targetRef: React.MutableRefObject<HTMLElement | null>;
}) {
  const scrollContainerRef = useManageScrollContainer();

  useLayoutEffect(() => {
    targetRef.current = scrollContainerRef?.current ?? null;
  }, [scrollContainerRef, targetRef]);

  return null;
}

function PhotosPageContent() {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContext = useContext(ModalContext);
  const searchParams = useSearchParams();
  const photoIdFromUrl = searchParams.get('photo');
  const isPhotosUploadTourMock = isPhotosTourMockMode(searchParams);
  const isPhotosManageTourMock = isPhotosManageTourMockMode(searchParams);
  const photoEditDirtyRef = useRef(false);
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const [isMobileEditSheetOpen, setIsMobileEditSheetOpen] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [libraryFilters, setLibraryFilters] = useState<PhotoLibraryFilters>(EMPTY_PHOTO_LIBRARY_FILTERS);
  const photoFilter = libraryFilters.visibility;
  const manageScrollContainerElRef = useRef<HTMLElement | null>(null);

  // React Query hooks
  const {
    photos,
    isPending: photosPending,
    isFetching: photosFetching,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    pageSize,
  } = usePhotos(user?.id, libraryFilters, { loadAll: !photoIdFromUrl });
  const { data: libraryPhotoCount = 0 } = usePhotoCount(user?.id);

  const openMobileEditSheet = useCallback(() => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsMobileEditSheetOpen(true);
      });
    });
  }, []);

  const applyLibraryFilters = useCallback(
    (filters: PhotoLibraryFilters) => {
      setLibraryFilters(filters);
      if (user?.id) {
        persistPhotoLibraryFilters(user.id, filters);
      }
    },
    [user?.id],
  );

  const clearLibraryFilters = useCallback(() => {
    setLibraryFilters(EMPTY_PHOTO_LIBRARY_FILTERS);
    if (user?.id) {
      clearPersistedPhotoLibraryFilters(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setLibraryFilters(loadPersistedPhotoLibraryFilters(user.id));
  }, [user?.id]);

  const ensureDeepLinkSelection = useCallback((photoId: string) => {
    setSelectedPhotoIds(new Set([photoId]));
  }, []);

  const handleDeepLinkPhotoNotFound = useCallback(() => {
    setSelectedPhotoIds(new Set());
    window.requestAnimationFrame(() => {
      void confirm({
        title: 'Photo not found',
        message:
          'We couldn\'t open that photo for editing. The link may be wrong, or the photo may have been deleted or isn\'t in your photo library.',
        confirmLabel: 'OK',
        hideCancel: true,
      });
    });
  }, [confirm]);

  const { pendingPhoto } = useManagePhotoDeepLink({
    userId: user?.id,
    photoIdFromUrl,
    pageSize,
    photos,
    onForceFilterAll: clearLibraryFilters,
    onEnsureSelection: ensureDeepLinkSelection,
    onOpenMobileEdit: openMobileEditSheet,
    onPhotoNotFound: handleDeepLinkPhotoNotFound,
    scrollContainerElRef: manageScrollContainerElRef,
  });
  const deletePhotosMutation = useDeletePhotos(user?.id, photoFilter, profile?.nickname);
  const updatePhotoMutation = useUpdatePhoto(user?.id, photoFilter, profile?.nickname);
  const bulkUpdatePhotosMutation = useBulkUpdatePhotos(user?.id, photoFilter, profile?.nickname);
  const reorderPhotosMutation = useReorderPhotos(user?.id, photoFilter, profile?.nickname);

  // Upload hook with progress tracking
  const { uploadingPhotos, localPreviewUrls, uploadFiles, clearCompleted, dismissUpload, releaseLocalPreview } = usePhotoUpload();
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

  const handleSelectPhoto = useCallback(async (photoId: string, isMultiSelect: boolean) => {
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
  }, [handleConfirmUnsavedChanges]);

  const handleClearSelection = useCallback(async () => {
    if (photoEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) return;
    setSelectedPhotoIds(new Set());
  }, [handleConfirmUnsavedChanges]);

  const handleSelectMultiple = useCallback(async (ids: string[]) => {
    if (photoEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) return;
    startTransition(() => {
      setSelectedPhotoIds(new Set(ids));
    });
  }, [handleConfirmUnsavedChanges]);

  const handlePhotoClick = useCallback(
    (photo: PhotoWithAlbums) => {
      void handleSelectPhoto(photo.id, false);
    },
    [handleSelectPhoto],
  );

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

  const handleOpenFilterModal = useCallback(() => {
    modalContext.setTitle('Filter photos');
    modalContext.setSize('medium');
    modalContext.setContent(
      <FilterPhotosModal
        activeFilters={libraryFilters}
        onApply={applyLibraryFilters}
        onClose={() => modalContext.setIsOpen(false)}
      />,
    );
    modalContext.setIsOpen(true);
  }, [applyLibraryFilters, libraryFilters, modalContext]);

  const handleAddToAlbum = (photoIds?: string[]) => {
    const ids = photoIds ?? Array.from(selectedPhotoIds);
    const photosToAdd = ids
      .map((id) => photos.find((p) => p.id === id))
      .filter((p): p is PhotoWithAlbums => p != null);
    if (photosToAdd.length === 0) return;

    modalContext.setTitle('Add to album');
    modalContext.setContent(
      <AddPhotosToAlbumModal
        photos={photosToAdd}
        onClose={() => modalContext.setIsOpen(false)}
        onSuccess={() => {
          if (user?.id) {
            queryClient.invalidateQueries({ queryKey: photosQueryFilterKey(user.id, photoFilter) });
            queryClient.invalidateQueries({ queryKey: ['albums', user.id] });
          }
        }}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const handleReorderPhotos = (newPhotos: PhotoWithAlbums[]) => {
    if (!user?.id) return;
    setAllPhotosQueriesFromFlat(queryClient, user.id, photoFilter, newPhotos);
    reorderPhotosMutation.mutate(newPhotos);
  };

  const handleUpload = async (files: File[]) => {
    if (!files || files.length === 0 || !user) return;

    try {
      const uploadedPhotos = await uploadFiles(files, user.id, supabase, {
        isPublic: false,
        sortOrderStart: photos.length,
        retainLocalPreviews: true,
      });

      if (uploadedPhotos.length > 0) {
        await queryClient.refetchQueries({ queryKey: photosQueryFilterKey(user.id, photoFilter) });
        queryClient.invalidateQueries({ queryKey: photoCountQueryKey(user.id) });
        queryClient.invalidateQueries({ queryKey: photoLibraryFilterOptionsQueryKey(user.id) });
      }

      // Drop the upload cards. Their file previews stay on the new grid items.
      clearCompleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload photos';
      console.error('Upload error:', err);
      alert(message);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(Array.from(files));
    }
  };

  const selectedPhotos = useMemo(() => {
    const fromGrid = photos.filter((p) => selectedPhotoIds.has(p.id));
    if (fromGrid.length > 0) return fromGrid;
    if (pendingPhoto && selectedPhotoIds.has(pendingPhoto.id)) return [pendingPhoto];
    return [];
  }, [photos, selectedPhotoIds, pendingPhoto]);
  const photoIds = useMemo(() => new Set(photos.map((photo) => photo.id)), [photos]);
  const visibleUploadingPhotos = useMemo(
    () => uploadingPhotos.filter((upload) => !upload.photo || !photoIds.has(upload.photo.id)),
    [uploadingPhotos, photoIds],
  );
  const deferredSelectedPhotos = useDeferredValue(selectedPhotos);
  const selectedCount = selectedPhotoIds.size;

  const isPhotosGridInitiallyLoading =
    photos.length === 0 && (photosPending || photosFetching);

  const showFilteredEmptyState =
    !isPhotosGridInitiallyLoading
    && photos.length === 0
    && uploadingPhotos.length === 0
    && !hasNextPage
    && !isFetchingNextPage
    && libraryPhotoCount > 0
    && isPhotoLibraryFiltersActive(libraryFilters);

  const showRealEmptyState =
    !isPhotosGridInitiallyLoading
    && photos.length === 0
    && uploadingPhotos.length === 0
    && !hasNextPage
    && !isFetchingNextPage
    && !showFilteredEmptyState;
  const showEmptyState =
    isPhotosUploadTourMock || (!isPhotosManageTourMock && showRealEmptyState);
  const manageTourActive =
    (isPhotosManageTourMock && photos.length > 0) ||
    (!showEmptyState && photos.length > 0 && !isPhotosGridInitiallyLoading);

  const prepareManageTour = useCallback(() => {
    if (photos.length === 0) return;
    setSelectedPhotoIds((prev) => {
      if (prev.size > 0) return prev;
      return new Set([photos[0].id]);
    });
  }, [photos]);

  usePhotosFirstRunTour({
    userId: user?.id,
    profile,
    refreshProfile,
    photosPending,
    uploadTourActive: showEmptyState,
    isUploadTourMock: isPhotosUploadTourMock,
    manageTourActive,
    isManageTourMock: isPhotosManageTourMock,
    prepareManageTour,
  });

  const handleMobileEdit = () => {
    openMobileEditSheet();
  };

  const handleMobileEditClose = async () => {
    if (photoEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) {
      return;
    }
    setIsMobileEditSheetOpen(false);
  };

  const activeFilterCount = countActivePhotoLibraryFilters(libraryFilters);

  const handleMobileBulkDelete = async () => {
    if (selectedCount === 0) return;

    const confirmed = await confirm(confirmDeletePhotos(selectedPhotos, selectedCount));
    if (!confirmed) return;
    await handleBulkDeletePhotos(Array.from(selectedPhotoIds));
  };

  return (
    <div
      className="flex flex-1 min-h-0"
    >
      <ManageLayout
        actions={
          <>
            <HelpLink
              id="photos-tour-help"
              href="upload-photos"
              label="How to upload photos"
              size="sm"
            />
            <Button
              id="photos-tour-filter"
              onClick={handleOpenFilterModal}
              variant="secondary"
              className={
                activeFilterCount > 0
                  ? 'border-primary/60 bg-[color-mix(in_srgb,var(--primary)_6%,var(--background-raised))]'
                  : undefined
              }
              icon={<FilterSVG
                className="size-5 -ml-0.5"
              />}
              aria-label={
                activeFilterCount > 0
                  ? `Filter photos, ${activeFilterCount} active`
                  : 'Filter photos'
              }
            >
              <span
                className="hidden md:inline"
              >
                Filter
              </span>
              {activeFilterCount > 0 && (
                <span
                  aria-hidden
                  className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-white tabular-nums"
                >
                  {activeFilterCount > 99 ? '99+' : activeFilterCount}
                </span>
              )}
            </Button>
            <Button
              id="photos-tour-upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              icon={<PlusMiniSVG
                className="size-5 -ml-0.5"
              />}
              variant="primary"
            >
              <span
                className="hidden md:inline-block"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </span>
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
            selectedPhotos={deferredSelectedPhotos}
            onSave={handleSavePhoto}
            onBulkSave={handleBulkSavePhotos}
            onDelete={handleDeletePhoto}
            onBulkDelete={handleBulkDeletePhotos}
            onAddToAlbum={handleAddToAlbum}
            isLoading={photosPending && photos.length === 0}
            onDirtyChange={handleDirtyChange}
            photoFilter={photoFilter}
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
                    icon={<TrashSVG
                      className="size-5 -ml-0.5"
                    />}
                  >
                    <span
                      className="hidden md:inline-block"
                    >
                      Delete
                    </span>
                  </Button>
                )}
                {selectedCount > 0 && (
                  <Button
                    id="photos-tour-mobile-album"
                    onClick={() => handleAddToAlbum(Array.from(selectedPhotoIds))}
                    variant="secondary"
                    size="sm"
                    icon={<FolderDownMiniSVG
                      className="size-5 -ml-0.5"
                    />}
                  >
                    <span
                      className="hidden md:inline-block"
                    >
                      Album
                    </span>
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
          className={showEmptyState ? 'flex min-h-0 flex-1 flex-col' : 'flex flex-col'}
          overlayMessage="Drop to upload"
        >
          <ManageScrollContainerBridge
            targetRef={manageScrollContainerElRef}
          />
          {showEmptyState ? (
            <EmptyState
              id="photos-tour-library"
              className="m-4 min-h-0 flex-1"
              icon={<ImageSVG
                className="size-10 inline-block"
              />}
              title="You don't have any photos yet"
              description='Drag and drop photos here, or use the "Upload" button to upload photos'
              action={(
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  icon={<PlusMiniSVG
                    className="size-5 -ml-0.5"
                  />}
                >
                  Upload
                </Button>
              )}
            />
          ) : showFilteredEmptyState ? (
            <EmptyState
              className="m-4 min-h-0 flex-1"
              icon={<ImageSVG
                className="size-10 inline-block"
              />}
              title="No photos match your filters"
              description="Try changing or clearing your filters to see more photos."
              action={(
                <Button
                  onClick={clearLibraryFilters}
                  variant="secondary"
                >
                  Clear filters
                </Button>
              )}
            />
          ) : !isPhotosUploadTourMock && !isPhotosManageTourMock && isPhotosGridInitiallyLoading ? (
            <ManagePhotoGridSkeleton />
          ) : (
            <>
              <PhotoGrid
                photos={photos}
                isLoading={isPhotosGridInitiallyLoading}
                selectedPhotoIds={selectedPhotoIds}
                onSelectPhoto={handleSelectPhoto}
                onPhotoClick={handlePhotoClick}
                onClearSelection={handleClearSelection}
                onSelectMultiple={handleSelectMultiple}
                onReorder={handleReorderPhotos}
                sortable={!isPhotoLibraryFiltersActive(libraryFilters)}
                localPreviewUrls={localPreviewUrls}
                onLocalPreviewReleased={releaseLocalPreview}
                leadingContent={
                  visibleUploadingPhotos.length > 0 ? (
                    <>
                      {visibleUploadingPhotos.map((upload) => (
                        <UploadingPhotoCard
                          key={upload.id}
                          upload={upload}
                          onDismiss={dismissUpload}
                        />
                      ))}
                    </>
                  ) : undefined
                }
              />
              {((hasNextPage && !isFetchNextPageError) || isFetchingNextPage) && (
                <div
                  className="flex justify-center py-4"
                  role="status"
                  aria-label="Loading more photos"
                >
                  <LoadingSpinner
                    size="sm"
                  />
                </div>
              )}
            </>
          )}
        </DropZone>
      </ManageLayout>

      {/* Mobile Edit Sheet */}
      <BottomSheet
        isOpen={isMobileEditSheetOpen}
        onClose={handleMobileEditClose}
        title={deferredSelectedPhotos.length === 0 ? undefined : deferredSelectedPhotos.length === 1 ? 'Edit photo' : `Edit ${deferredSelectedPhotos.length} photos`}
      >
        <PhotoEditSidebar
          selectedPhotos={deferredSelectedPhotos}
          onSave={handleSavePhoto}
          onBulkSave={handleBulkSavePhotos}
          onDelete={handleDeletePhoto}
          onBulkDelete={handleBulkDeletePhotos}
          onAddToAlbum={handleAddToAlbum}
          isLoading={photosPending}
          onDirtyChange={handleDirtyChange}
          hideTitle
          photoFilter={photoFilter}
        />
      </BottomSheet>
    </div>
  );
}
