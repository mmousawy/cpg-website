'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import { ModalContext } from '@/app/providers/ModalProvider';
import {
  AddToAlbumContent,
  AlbumEditSidebar,
  ManageLayout,
  MobileActionBar,
  PhotoEditSidebar,
  PhotoGrid,
  UploadingPhotoCard,
  type AlbumFormData,
  type BulkPhotoFormData,
  type PhotoFormData,
} from '@/components/manage';
import BottomSheet from '@/components/shared/BottomSheet';
import Button from '@/components/shared/Button';
import DropZone from '@/components/shared/DropZone';
import PageLoading from '@/components/shared/PageLoading';
import { useUnsavedChanges } from '@/context/UnsavedChangesContext';
import { revalidateAlbum } from '@/app/actions/revalidate';
import { useDeleteAlbums, useUpdateAlbum } from '@/hooks/useAlbumMutations';
import {
  useBulkUpdateAlbumPhotos,
  useDeleteAlbumPhoto,
  useRemoveFromAlbum,
  useReorderAlbumPhotos,
  useSetAlbumCover,
  useUpdateAlbumPhoto,
} from '@/hooks/useAlbumPhotoMutations';
import { useAlbumPhotos } from '@/hooks/useAlbumPhotos';
import { useAlbumBySlug } from '@/hooks/useAlbums';
import { useAuth } from '@/hooks/useAuth';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { useSupabase } from '@/hooks/useSupabase';
import type { PhotoWithAlbums } from '@/types/photos';
import { confirmRemoveFromAlbum, confirmUnsavedChanges } from '@/utils/confirmHelpers';
import { preloadImages } from '@/utils/preloadImages';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import FolderSVG from 'public/icons/folder.svg';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import CloseMiniSVG from 'public/icons/close-mini.svg';
import GalleryMiniSVG from 'public/icons/gallery-mini.svg';
import PlusSVG from 'public/icons/plus.svg';

export default function AlbumDetailClient() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { user, profile } = useAuth();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const modalContext = useContext(ModalContext);
  const confirm = useConfirm();
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photoEditDirtyRef = useRef(false);
  const albumEditDirtyRef = useRef(false);
  const [isMobileEditSheetOpen, setIsMobileEditSheetOpen] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());

  // React Query hooks
  const { data: album, isLoading: albumLoading, error: albumError } = useAlbumBySlug(user?.id, slug);
  const { data: photos = [], isLoading: photosLoading } = useAlbumPhotos(album?.id);
  const updateAlbumPhotoMutation = useUpdateAlbumPhoto(album?.id, profile?.nickname);
  const bulkUpdateAlbumPhotosMutation = useBulkUpdateAlbumPhotos(album?.id, profile?.nickname);
  const deleteAlbumPhotoMutation = useDeleteAlbumPhoto(album?.id, user?.id, profile?.nickname);
  const removeFromAlbumMutation = useRemoveFromAlbum(album?.id, user?.id, profile?.nickname);
  const reorderAlbumPhotosMutation = useReorderAlbumPhotos(album?.id, profile?.nickname);
  const updateAlbumMutation = useUpdateAlbum(user?.id, profile?.nickname);
  const deleteAlbumsMutation = useDeleteAlbums(user?.id, profile?.nickname);
  const setAlbumCoverMutation = useSetAlbumCover(user?.id, profile?.nickname);

  // Upload hook with progress tracking
  const { uploadingPhotos, uploadFiles, clearCompleted, dismissUpload } = usePhotoUpload();
  const isUploading = uploadingPhotos.some(
    (p) => p.status === 'uploading' || p.status === 'processing' || p.status === 'pending',
  );

  // Redirect if album not found
  useEffect(() => {
    if (albumError && user) {
      router.push('/account/albums');
    }
  }, [albumError, router, user]);

  // Sync dirty state with global unsaved changes context
  const handlePhotoDirtyChange = useCallback(
    (isDirty: boolean) => {
      photoEditDirtyRef.current = isDirty;
      setHasUnsavedChanges(isDirty || albumEditDirtyRef.current);
    },
    [setHasUnsavedChanges],
  );

  const handleAlbumDirtyChange = useCallback(
    (isDirty: boolean) => {
      albumEditDirtyRef.current = isDirty;
      setHasUnsavedChanges(isDirty || photoEditDirtyRef.current);
    },
    [setHasUnsavedChanges],
  );

  // Clear unsaved changes on unmount
  useEffect(() => {
    return () => setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  const handleConfirmUnsavedChanges = useCallback(async (): Promise<boolean> => {
    const isDirty = photoEditDirtyRef.current || albumEditDirtyRef.current;
    if (!isDirty) return true;
    const confirmed = await confirm(confirmUnsavedChanges());
    if (confirmed) {
      photoEditDirtyRef.current = false;
      albumEditDirtyRef.current = false;
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
    if (!album) return;

    photoEditDirtyRef.current = false;
    setHasUnsavedChanges(albumEditDirtyRef.current);

    await updateAlbumPhotoMutation.mutateAsync({ photoId, data });
  };

  const handleBulkSavePhotos = async (photoIds: string[], data: BulkPhotoFormData) => {
    if (!album) return;

    photoEditDirtyRef.current = false;
    setHasUnsavedChanges(albumEditDirtyRef.current);

    await bulkUpdateAlbumPhotosMutation.mutateAsync({ photoIds, data });
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!album) return;

    const photo = photos.find((p) => p.id === photoId);
    if (!photo?.album_photo_id) return;

    photoEditDirtyRef.current = false;
    setHasUnsavedChanges(albumEditDirtyRef.current);

    await deleteAlbumPhotoMutation.mutateAsync(photo.album_photo_id);

    setSelectedPhotoIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
  };

  const handleRemoveFromAlbum = async (photoIds: string[]) => {
    if (!album) return;

    const photosToRemove = photos.filter((p) => photoIds.includes(p.id));
    if (photosToRemove.length === 0) return;

    const confirmed = await confirm(confirmRemoveFromAlbum(photosToRemove, photoIds.length));
    if (!confirmed) return;

    const albumPhotoIds = photoIds
      .map((id) => photos.find((p) => p.id === id)?.album_photo_id)
      .filter((id): id is string => !!id);

    if (albumPhotoIds.length > 0) {
      photoEditDirtyRef.current = false;
      setHasUnsavedChanges(albumEditDirtyRef.current);

      await removeFromAlbumMutation.mutateAsync(albumPhotoIds);

      setSelectedPhotoIds(new Set());
    }
  };

  const handleReorderPhotos = async (newPhotos: PhotoWithAlbums[]) => {
    await reorderAlbumPhotosMutation.mutateAsync(newPhotos);
  };

  const handleSetAsCover = async (photoUrl: string, albumId: string) => {
    await setAlbumCoverMutation.mutateAsync({ albumId, photoUrl });
  };

  const handleSaveAlbum = async (albumId: string, data: AlbumFormData) => {
    if (!album) return;

    albumEditDirtyRef.current = false;
    setHasUnsavedChanges(photoEditDirtyRef.current);

    await updateAlbumMutation.mutateAsync({ albumId, data });

    // If slug changed, navigate to new URL
    if (data.slug !== slug) {
      router.replace(`/account/albums/${data.slug}`);
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!album) return;

    albumEditDirtyRef.current = false;
    photoEditDirtyRef.current = false;
    setHasUnsavedChanges(false);

    await deleteAlbumsMutation.mutateAsync([albumId]);

    router.push('/account/albums');
  };

  const handleAddFromLibrary = () => {
    if (!album) return;

    modalContext.setSize('large');
    modalContext.setTitle('Add Photos from Library');
    modalContext.setContent(
      <AddToAlbumContent
        albumId={album.id}
        existingPhotoUrls={photos.map((p) => p.url)}
        onClose={() => modalContext.setIsOpen(false)}
        onSuccess={async () => {
          queryClient.invalidateQueries({ queryKey: ['album-photos', album.id] });
          queryClient.invalidateQueries({ queryKey: ['albums', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['photos', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['counts', user?.id] });
          // Revalidate server-side cache for public pages
          if (profile?.nickname && album.is_public) {
            await revalidateAlbum(profile.nickname, album.slug);
          }
          modalContext.setIsOpen(false);
        }}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !album) return;

    try {
      const uploadedPhotos = await uploadFiles(Array.from(files), user.id, supabase, {
        albumIds: [album.id],
        isPublic: false,
        sortOrderStart: photos.length,
      });

      // Preload images before refreshing the list to prevent layout shift
      if (uploadedPhotos.length > 0) {
        const photoUrls = uploadedPhotos.map((p) => p.url);
        await preloadImages(photoUrls);
      }

      // Refresh the list and wait for it to refetch
      await queryClient.refetchQueries({ queryKey: ['album-photos', album.id] });
      queryClient.invalidateQueries({ queryKey: ['counts', user.id] });
      queryClient.invalidateQueries({ queryKey: ['albums', user.id] });

      // Revalidate server-side cache for public pages
      if (profile?.nickname && album.is_public) {
        await revalidateAlbum(profile.nickname, album.slug);
      }

      // Clear completed uploads after query has refetched and images are preloaded
      clearCompleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload photos';
      console.error('Upload error:', err);
      alert(message);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileDrop = (files: File[]) => {
    if (!album) return;
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    const fakeEvent = { target: { files: dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>;
    handleUpload(fakeEvent);
  };

  const selectedPhotos = photos.filter((p) => selectedPhotoIds.has(p.id));
  const selectedCount = selectedPhotoIds.size;

  // Mobile handlers
  const handleMobileEdit = () => {
    // Only open on mobile (below md breakpoint)
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setIsMobileEditSheetOpen(true);
    }
  };

  const handleMobileEditClose = async () => {
    const isDirty = photoEditDirtyRef.current || albumEditDirtyRef.current;
    if (isDirty && !(await handleConfirmUnsavedChanges())) {
      return;
    }
    setIsMobileEditSheetOpen(false);
  };

  const handleMobileRemoveFromAlbum = async () => {
    if (selectedCount === 0) return;
    await handleRemoveFromAlbum(Array.from(selectedPhotoIds));
  };

  if (albumLoading && !album) {
    return (
      <ManageLayout
        albumDetail={{ title: '...' }}
        sidebar={<PageLoading
          message="Loading..."
        />}
      >
        <PageLoading
          message="Loading album..."
        />
      </ManageLayout>
    );
  }

  if (!album) {
    return null;
  }

  return (
    <>
      <ManageLayout
        albumDetail={{ title: album.title }}
        actions={
          <>
            <Button
              onClick={handleAddFromLibrary}
              icon={<GalleryMiniSVG
                className="size-5 -ml-0.5"
              />}
              variant="secondary"
              className="hidden md:flex"
            >
              <span
                className="hidden md:inline-block"
              >
                Add from library
              </span>
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              icon={<PlusSVG
                className="size-5 -ml-0.5"
              />}
              variant="primary"
            >
              <span
                className="hidden md:inline"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </>
        }
        sidebar={
          selectedPhotos.length > 0 ? (
            <PhotoEditSidebar
              selectedPhotos={selectedPhotos}
              onSave={handleSavePhoto}
              onBulkSave={handleBulkSavePhotos}
              onDelete={handleDeletePhoto}
              onRemoveFromAlbum={handleRemoveFromAlbum}
              onSetAsCover={handleSetAsCover}
              currentAlbum={album ? { id: album.id, slug: album.slug, cover_image_url: album.cover_image_url } : null}
              isLoading={photosLoading && photos.length === 0}
              onDirtyChange={handlePhotoDirtyChange}
            />
          ) : (
            <AlbumEditSidebar
              selectedAlbums={album ? [album] : []}
              nickname={profile?.nickname}
              onSave={handleSaveAlbum}
              onDelete={handleDeleteAlbum}
              onBulkSave={async () => {}}
              onBulkDelete={async () => {}}
              isLoading={photosLoading && photos.length === 0}
              onDirtyChange={handleAlbumDirtyChange}
            />
        )}
        mobileActionBar={
          selectedCount > 0 ? (
            <MobileActionBar
              selectedCount={selectedCount}
              onEdit={handleMobileEdit}
              onClearSelection={handleClearSelection}
              actions={
                <Button
                  onClick={handleMobileRemoveFromAlbum}
                  variant="secondary"
                  size="sm"
                  icon={<CloseMiniSVG
                    className="size-5 -ml-0.5"
                  />}
                >
                  <span
                    className="hidden md:inline-block"
                  >
                    Remove
                  </span>
                </Button>
              }
            />
          ) : (
            // Show edit album button when no photos selected on mobile
            <div
              className="md:hidden border-t border-border-color-strong bg-background-light px-4 py-3"
            >
              <Button
                onClick={handleMobileEdit}
                variant="secondary"
                className="w-full"
              >
                Edit Album
              </Button>
            </div>
        )}
      >
        <DropZone
          onDrop={handleFileDrop}
          disabled={isUploading}
          className="flex-1 flex flex-col min-h-0"
          overlayMessage="Drop to add to album"
        >
          {photosLoading && photos.length === 0 ? (
            <PageLoading
              message="Loading photos..."
            />
          ) : photos.length === 0 && uploadingPhotos.length === 0 ? (
            <div
              className="border-2 border-dashed border-border-color p-12 text-center m-4 h-full flex flex-col items-center justify-center"
            >
              <FolderSVG
                className="size-10 mb-2 inline-block"
              />
              <p
                className="mb-2 text-lg opacity-70"
              >
                No photos in this album
              </p>
              <p
                className="text-sm text-foreground/50"
              >
                Drag and drop photos here, or use the buttons above
              </p>
            </div>
          ) : (
            <PhotoGrid
              photos={photos}
              selectedPhotoIds={selectedPhotoIds}
              onSelectPhoto={handleSelectPhoto}
              onPhotoClick={(photo) => handleSelectPhoto(photo.id, false)}
              onReorder={handleReorderPhotos}
              onClearSelection={handleClearSelection}
              onSelectMultiple={handleSelectMultiple}
              sortable
              alwaysShowMobileSpacer
              albumCoverUrl={album?.cover_image_url}
              currentAlbumTitle={album?.title}
              leadingContent={
                uploadingPhotos.length > 0 ? (
                  <>
                    {uploadingPhotos.map((upload) => (
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
          )}
        </DropZone>
      </ManageLayout>

      {/* Mobile Edit Sheet */}
      <BottomSheet
        isOpen={isMobileEditSheetOpen}
        onClose={handleMobileEditClose}
        title={selectedPhotos.length > 0
          ? (selectedPhotos.length === 1 ? 'Edit photo' : `Edit ${selectedPhotos.length} photos`)
          : 'Edit album'
        }
      >
        {selectedPhotos.length > 0 ? (
          <PhotoEditSidebar
            selectedPhotos={selectedPhotos}
            onSave={handleSavePhoto}
            onBulkSave={handleBulkSavePhotos}
            onDelete={handleDeletePhoto}
            onRemoveFromAlbum={handleRemoveFromAlbum}
            onSetAsCover={handleSetAsCover}
            currentAlbum={album ? { id: album.id, slug: album.slug, cover_image_url: album.cover_image_url } : null}
            isLoading={photosLoading}
            onDirtyChange={handlePhotoDirtyChange}
            hideTitle
          />
        ) : (
          <AlbumEditSidebar
            selectedAlbums={album ? [album] : []}
            nickname={profile?.nickname}
            onSave={handleSaveAlbum}
            onDelete={handleDeleteAlbum}
            onBulkSave={async () => {}}
            onBulkDelete={async () => {}}
            isLoading={photosLoading}
            onDirtyChange={handleAlbumDirtyChange}
            hideTitle
          />
        )}
      </BottomSheet>
    </>
  );
}
