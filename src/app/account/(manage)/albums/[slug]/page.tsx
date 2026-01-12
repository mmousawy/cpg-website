'use client';

import { revalidateAlbum } from '@/app/actions/revalidate';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { ModalContext } from '@/app/providers/ModalProvider';
import {
  AddToAlbumContent,
  AlbumEditSidebar,
  ManageLayout,
  MobileActionBar,
  PhotoEditSidebar,
  PhotoGrid,
  PhotoListItem,
  UploadingPhotoCard,
  type AlbumFormData,
  type PhotoFormData,
} from '@/components/manage';
import BottomSheet from '@/components/shared/BottomSheet';
import Button from '@/components/shared/Button';
import DropZone from '@/components/shared/DropZone';
import PageLoading from '@/components/shared/PageLoading';
import { useManage } from '@/context/ManageContext';
import { useUnsavedChanges } from '@/context/UnsavedChangesContext';
import { useAuth } from '@/hooks/useAuth';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import type { Album } from '@/types/albums';
import type { Photo, PhotoWithAlbums } from '@/types/photos';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import FolderSVG from 'public/icons/folder.svg';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import CloseMiniSVG from 'public/icons/close-mini.svg';
import GalleryMiniSVG from 'public/icons/gallery-mini.svg';
import PlusSVG from 'public/icons/plus.svg';

export default function AlbumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { user, profile } = useAuth();
  const supabase = createClient();
  const modalContext = useContext(ModalContext);
  const { refreshCounts } = useManage();
  const confirm = useConfirm();
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photoEditDirtyRef = useRef(false);
  const albumEditDirtyRef = useRef(false);
  const [isMobileEditSheetOpen, setIsMobileEditSheetOpen] = useState(false);

  // Sync dirty state with global unsaved changes context
  const handlePhotoDirtyChange = useCallback((isDirty: boolean) => {
    photoEditDirtyRef.current = isDirty;
    setHasUnsavedChanges(isDirty || albumEditDirtyRef.current);
  }, [setHasUnsavedChanges]);

  const handleAlbumDirtyChange = useCallback((isDirty: boolean) => {
    albumEditDirtyRef.current = isDirty;
    setHasUnsavedChanges(isDirty || photoEditDirtyRef.current);
  }, [setHasUnsavedChanges]);

  // Clear unsaved changes on unmount
  useEffect(() => {
    return () => setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  const confirmUnsavedChanges = useCallback(async (): Promise<boolean> => {
    const isDirty = photoEditDirtyRef.current || albumEditDirtyRef.current;
    if (!isDirty) return true;
    const confirmed = await confirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Are you sure you want to leave without saving?',
      confirmLabel: 'Leave',
      variant: 'danger',
    });
    if (confirmed) {
      photoEditDirtyRef.current = false;
      albumEditDirtyRef.current = false;
      setHasUnsavedChanges(false);
    }
    return confirmed;
  }, [confirm, setHasUnsavedChanges]);

  // State
  const [album, setAlbum] = useState<Album | null>(null);
  const [albumLoading, setAlbumLoading] = useState(true);
  const [photos, setPhotos] = useState<PhotoWithAlbums[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());

  // Upload hook with progress tracking
  const { uploadingPhotos, uploadFiles, clearCompleted } = usePhotoUpload();
  const isUploading = uploadingPhotos.some((p) => p.status === 'uploading' || p.status === 'processing' || p.status === 'pending');

  useEffect(() => {
    if (!user || !slug) return;
    fetchAlbum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, slug]);

  const fetchAlbum = async () => {
    if (!user) return;

    setAlbumLoading(true);
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('user_id', user.id)
        .eq('slug', slug)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        console.error('Error fetching album:', error);
        router.push('/account/albums');
        return;
      }

      setAlbum(data as Album);
      await fetchPhotos(data.id, true);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
    setAlbumLoading(false);
  };

  const fetchPhotos = async (albumId: string, showLoading = false) => {
    if (!user) return;

    if (showLoading || photos.length === 0) {
      setPhotosLoading(true);
    }
    try {
      const { data: albumPhotosData, error } = await supabase
        .from('album_photos')
        .select(`
          id,
          album_id,
          photo_url,
          title,
          sort_order,
          photo:photos!album_photos_photo_id_fkey(*)
        `)
        .eq('album_id', albumId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching album photos:', error);
      } else if (albumPhotosData) {
        const unifiedPhotos: PhotoWithAlbums[] = albumPhotosData
          .filter((ap) => ap.photo && !(ap.photo as any).deleted_at)
          .map((ap) => {
            const photoData = ap.photo as unknown as Photo;
            return {
              ...photoData,
              title: ap.title || photoData.title,
              album_photo_id: ap.id,
              album_sort_order: ap.sort_order,
            };
          });
        setPhotos(unifiedPhotos);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
    setPhotosLoading(false);
  };

  const handleSelectPhoto = async (photoId: string, isMultiSelect: boolean) => {
    if (!isMultiSelect && photoEditDirtyRef.current && !(await confirmUnsavedChanges())) {
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
    if (photoEditDirtyRef.current && !(await confirmUnsavedChanges())) return;
    setSelectedPhotoIds(new Set());
  };

  const handleSelectMultiple = async (ids: string[]) => {
    if (photoEditDirtyRef.current && !(await confirmUnsavedChanges())) return;
    setSelectedPhotoIds(new Set(ids));
  };

  const handleSavePhoto = async (photoId: string, data: PhotoFormData) => {
    if (!user || !album) return;

    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    if (photo.album_photo_id) {
      await supabase
        .from('album_photos')
        .update({ title: data.title })
        .eq('id', photo.album_photo_id);
    }

    await supabase
      .from('photos')
      .update({
        title: data.title,
        description: data.description,
        is_public: data.is_public,
      })
      .eq('id', photoId)
      .is('deleted_at', null);

    // Revalidate the album page
    if (profile?.nickname) {
      await revalidateAlbum(profile.nickname, album.slug);
    }

    await fetchPhotos(album.id);
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!album) return;

    const photo = photos.find((p) => p.id === photoId);
    if (!photo?.album_photo_id) return;

    // Delete triggers automatic cover update via database trigger
    await supabase.from('album_photos').delete().eq('id', photo.album_photo_id);

    // Reset dirty state after successful deletion
    photoEditDirtyRef.current = false;
    setHasUnsavedChanges(albumEditDirtyRef.current);

    setSelectedPhotoIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });

    // Revalidate the album page
    if (profile?.nickname) {
      await revalidateAlbum(profile.nickname, album.slug);
    }

    await fetchPhotos(album.id);
  };

  const handleRemoveFromAlbum = async (photoIds: string[]) => {
    if (!album) return;

    const albumPhotoIds = photoIds
      .map((id) => photos.find((p) => p.id === id)?.album_photo_id)
      .filter((id): id is string => !!id);

    if (albumPhotoIds.length > 0) {
      // Use RPC for atomic bulk removal (cover is automatically updated by database trigger)
      const { error } = await supabase.rpc('bulk_remove_from_album', {
        p_album_photo_ids: albumPhotoIds,
      });

      if (error) {
        throw new Error(error.message || 'Failed to remove photos from album');
      }
    }

    // Reset dirty state after successful removal
    photoEditDirtyRef.current = false;
    setHasUnsavedChanges(albumEditDirtyRef.current);

    // Revalidate the album page
    if (profile?.nickname) {
      await revalidateAlbum(profile.nickname, album.slug);
    }

    setSelectedPhotoIds(new Set());
    await fetchPhotos(album.id);
  };

  const handleReorderPhotos = async (newPhotos: PhotoWithAlbums[]) => {
    setPhotos(newPhotos);

    const updates = newPhotos
      .filter((photo) => photo.album_photo_id)
      .map((photo, index) => ({
        id: photo.album_photo_id!,
        sort_order: index,
      }));

    if (updates.length > 0) {
      // Reorder triggers automatic cover update via database trigger
      await supabase.rpc('batch_update_album_photos', { photo_updates: updates });

      // Revalidate the album page after reordering
      if (profile?.nickname && album) {
        await revalidateAlbum(profile.nickname, album.slug);
      }
    }
  };

  const handleSaveAlbum = async (albumId: string, data: AlbumFormData) => {
    if (!user || !album) return;

    // Note: cover_image_url is managed by database trigger on album_photos changes
    // Note: updated_at is automatically set by database trigger
    const { error: updateError } = await supabase
      .from('albums')
      .update({
        title: data.title.trim(),
        slug: data.slug.trim(),
        description: data.description?.trim() || null,
        is_public: data.isPublic,
      })
      .eq('id', albumId)
      .is('deleted_at', null);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update album');
    }

    // Update tags
    await supabase.from('album_tags').delete().eq('album_id', albumId);
    if (data.tags.length > 0) {
      await supabase.from('album_tags').insert(
        data.tags.map((tag) => ({ album_id: albumId, tag: tag.toLowerCase() })),
      );
    }

    if (profile?.nickname) {
      await revalidateAlbum(profile.nickname, data.slug);
    }

    // If slug changed, navigate to new URL
    if (data.slug !== slug) {
      router.replace(`/account/albums/${data.slug}`);
    } else {
      setAlbum({ ...album, title: data.title.trim(), slug: data.slug.trim(), description: data.description?.trim() || null, is_public: data.isPublic });
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!album || !user) return;

    // Use atomic RPC function to delete album and all related data in one transaction
    const { data: success, error } = await supabase.rpc('delete_album', {
      p_album_id: albumId,
    });

    if (error || !success) {
      throw new Error(error?.message || 'Failed to delete album');
    }

    // Reset dirty state after successful deletion
    albumEditDirtyRef.current = false;
    photoEditDirtyRef.current = false;
    setHasUnsavedChanges(false);

    if (profile?.nickname) {
      await revalidateAlbum(profile.nickname, album.slug);
    }

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
        onSuccess={() => {
          fetchPhotos(album.id);
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
      await uploadFiles(Array.from(files), user.id, supabase, {
        albumIds: [album.id],
        isPublic: false,
        bucketName: 'user-albums',
        pathPrefix: `${user.id}/${album.id}/`,
        sortOrderStart: photos.length,
      });

      // Clear completed uploads and refresh the list
      clearCompleted();
      // Cover is automatically updated by database trigger on album_photos insert
      await fetchPhotos(album.id);
      refreshCounts();
    } catch (err: any) {
      console.error('Upload error:', err);
      alert(err.message || 'Failed to upload photos');
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
    if (window.matchMedia('(max-width: 767px)').matches) {
      setIsMobileEditSheetOpen(true);
    }
  };

  const handleMobileEditClose = async () => {
    const isDirty = photoEditDirtyRef.current || albumEditDirtyRef.current;
    if (isDirty && !(await confirmUnsavedChanges())) {
      return;
    }
    setIsMobileEditSheetOpen(false);
  };

  const handleMobileRemoveFromAlbum = async () => {
    if (selectedCount === 0) return;

    const confirmed = await confirm({
      title: 'Remove from Album',
      message: `Are you sure you want to remove ${selectedCount} photo${selectedCount !== 1 ? 's' : ''} from this album?`,
      content: (
        <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
          {selectedPhotos.map((photo) => (
            <PhotoListItem key={photo.id} photo={photo} variant="compact" />
          ))}
        </div>
      ),
      confirmLabel: 'Remove',
      variant: 'danger',
    });

    if (!confirmed) return;
    await handleRemoveFromAlbum(Array.from(selectedPhotoIds));
  };

  if (albumLoading) {
    return (
      <ManageLayout
        albumDetail={{ title: '...' }}
        sidebar={<PageLoading message="Loading..." />}
      >
        <PageLoading message="Loading album..." />
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
            <Button onClick={handleAddFromLibrary} icon={<GalleryMiniSVG className="size-5 -ml-0.5" />} variant="secondary" className="hidden md:flex">
              <span className="hidden md:inline-block">Add from library</span>
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              icon={<PlusSVG className="size-5 -ml-0.5" />}
              variant="primary"
            >
              <span className="hidden md:inline">{isUploading ? 'Uploading...' : 'Upload'}</span>
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
              onDelete={handleDeletePhoto}
              onRemoveFromAlbum={handleRemoveFromAlbum}
              isLoading={photosLoading}
              onDirtyChange={handlePhotoDirtyChange}
            />
          ) : (
            <AlbumEditSidebar
              selectedAlbums={album ? [album as any] : []}
              nickname={profile?.nickname}
              onSave={handleSaveAlbum}
              onDelete={handleDeleteAlbum}
              onBulkSave={async () => {}}
              onBulkDelete={async () => {}}
              isLoading={photosLoading}
              onDirtyChange={handleAlbumDirtyChange}
            />
          )
        }
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
                  icon={<CloseMiniSVG className="size-5 -ml-0.5" />}
                >
                  <span className="hidden md:inline-block">Remove</span>
                </Button>
              }
            />
          ) : (
            // Show edit album button when no photos selected on mobile
            <div className="md:hidden border-t border-border-color-strong bg-background-light px-4 py-3">
              <Button
                onClick={handleMobileEdit}
                variant="secondary"
                className="w-full"
              >
                Edit Album
              </Button>
            </div>
          )
        }
      >
        <DropZone
          onDrop={handleFileDrop}
          disabled={isUploading}
          className="flex-1 flex flex-col min-h-0"
          overlayMessage="Drop to add to album"
        >
          {photosLoading ? (
            <PageLoading message="Loading photos..." />
          ) : photos.length === 0 && uploadingPhotos.length === 0 ? (
            <div className="border-2 border-dashed border-border-color p-12 text-center m-4 h-full flex flex-col items-center justify-center">
              <FolderSVG className="size-10 mb-2 inline-block" />
              <p className="mb-2 text-lg opacity-70">No photos in this album</p>
              <p className="text-sm text-foreground/50">
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
              trailingContent={
                uploadingPhotos.length > 0 ? (
                  <>
                    {uploadingPhotos.map((upload) => (
                      <UploadingPhotoCard key={upload.id} upload={upload} />
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
      >
        {selectedPhotos.length > 0 ? (
          <PhotoEditSidebar
            selectedPhotos={selectedPhotos}
            onSave={handleSavePhoto}
            onDelete={handleDeletePhoto}
            onRemoveFromAlbum={handleRemoveFromAlbum}
            isLoading={photosLoading}
            onDirtyChange={handlePhotoDirtyChange}
          />
        ) : (
          <AlbumEditSidebar
            selectedAlbums={album ? [album as any] : []}
            nickname={profile?.nickname}
            onSave={handleSaveAlbum}
            onDelete={handleDeleteAlbum}
            onBulkSave={async () => {}}
            onBulkDelete={async () => {}}
            isLoading={photosLoading}
            onDirtyChange={handleAlbumDirtyChange}
          />
        )}
      </BottomSheet>
    </>
  );
}
