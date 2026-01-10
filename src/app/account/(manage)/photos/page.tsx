'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import { ModalContext } from '@/app/providers/ModalProvider';
import {
  AddPhotosToAlbumModal,
  PhotoEditSidebar,
  PhotoGrid,
  type BulkPhotoFormData,
  type PhotoFormData,
} from '@/components/manage';
import ManageLayout from '@/components/manage/ManageLayout';
import Button from '@/components/shared/Button';
import DropZone from '@/components/shared/DropZone';
import PageLoading from '@/components/shared/PageLoading';
import { useManage } from '@/context/ManageContext';
import { useUnsavedChanges } from '@/context/UnsavedChangesContext';
import { useAuth } from '@/hooks/useAuth';
import type { Photo, PhotoWithAlbums } from '@/types/photos';
import { createClient } from '@/utils/supabase/client';
import exifr from 'exifr';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import ImageSVG from 'public/icons/image.svg';
import PlusSVG from 'public/icons/plus.svg';

export default function PhotosPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const { refreshCounts } = useManage();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContext = useContext(ModalContext);

  const photoEditDirtyRef = useRef(false);
  const { setHasUnsavedChanges } = useUnsavedChanges();

  // Sync dirty state with global unsaved changes context
  const handleDirtyChange = useCallback((isDirty: boolean) => {
    photoEditDirtyRef.current = isDirty;
    setHasUnsavedChanges(isDirty);
  }, [setHasUnsavedChanges]);

  // Clear unsaved changes on unmount
  useEffect(() => {
    return () => setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  const confirmUnsavedChanges = useCallback(async (): Promise<boolean> => {
    if (!photoEditDirtyRef.current) return true;
    const confirmed = await confirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Are you sure you want to leave without saving?',
      confirmLabel: 'Leave',
      variant: 'danger',
    });
    if (confirmed) {
      photoEditDirtyRef.current = false;
      setHasUnsavedChanges(false);
    }
    return confirmed;
  }, [confirm, setHasUnsavedChanges]);

  // State
  const [photos, setPhotos] = useState<PhotoWithAlbums[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [photosLoading, setPhotosLoading] = useState(true);
  const [photoFilter, setPhotoFilter] = useState<'all' | 'public' | 'private'>('all');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchPhotos(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, photoFilter]);

  const fetchPhotos = async (showLoading = false) => {
    if (!user) return;

    if (showLoading || photos.length === 0) {
      setPhotosLoading(true);
    }
    try {
      let query = supabase
        .from('photos')
        .select(`
          *,
          album_photos!album_photos_photo_id_fkey(
            album:albums(
              id,
              title,
              slug,
              cover_image_url,
              profile:profiles(nickname),
              album_photos(count)
            )
          )
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (photoFilter === 'public') {
        query = query.eq('is_public', true);
      } else if (photoFilter === 'private') {
        query = query.eq('is_public', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching photos:', error);
      } else {
        const photosWithAlbums = (data || []).map((photo) => {
          const albums = (photo.album_photos || [])
            .map((ap: { album: { id: string; title: string; slug: string; cover_image_url: string | null; profile: { nickname: string } | null; album_photos: { count: number }[] } | null }) => ap.album)
            .filter((a: unknown): a is { id: string; title: string; slug: string; cover_image_url: string | null; profile: { nickname: string } | null; album_photos: { count: number }[] } => a !== null)
            .map((a: { id: string; title: string; slug: string; cover_image_url: string | null; profile: { nickname: string } | null; album_photos: { count: number }[] }) => ({
              id: a.id,
              title: a.title,
              slug: a.slug,
              cover_image_url: a.cover_image_url,
              profile_nickname: a.profile?.nickname || null,
              photo_count: a.album_photos?.[0]?.count ?? 0,
            }));

          const { album_photos: _, ...photoData } = photo;
          return { ...photoData, albums };
        });

        setPhotos(photosWithAlbums as PhotoWithAlbums[]);
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
    if (!user) return;

    const { error } = await supabase
      .from('photos')
      .update({
        title: data.title,
        description: data.description,
        is_public: data.is_public,
      })
      .eq('id', photoId)
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (error) {
      throw new Error(error.message || 'Failed to save photo');
    }

    await fetchPhotos();
  };

  const handleBulkSavePhotos = async (photoIds: string[], data: BulkPhotoFormData) => {
    if (!user) return;

    const updates = photoIds.map((id) => ({
      id,
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.is_public !== null && { is_public: data.is_public }),
    }));

    const { error } = await supabase.rpc('batch_update_photos', {
      photo_updates: updates,
    });

    if (error) {
      throw new Error(error.message || 'Failed to save photos');
    }

    await fetchPhotos();
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!user) return;

    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    if (photo.storage_path) {
      const pathParts = photo.storage_path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const filePath = `${user.id}/${fileName}`;
      await supabase.storage.from('user-photos').remove([filePath]);
    }

    // Soft delete photo using RPC function
    const { error } = await supabase.rpc('bulk_delete_photos', {
      p_photo_ids: [photoId],
    });

    if (error) {
      throw new Error(error.message || 'Failed to delete photo');
    }

    // Reset dirty state after successful deletion
    photoEditDirtyRef.current = false;
    setHasUnsavedChanges(false);

    setSelectedPhotoIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
    await fetchPhotos();
    refreshCounts();
  };

  const handleBulkDeletePhotos = async (photoIds: string[]) => {
    if (!user || photoIds.length === 0) return;

    // First, delete storage files in parallel
    const photosToDelete = photos.filter((p) => photoIds.includes(p.id));
    const storagePaths = photosToDelete
      .filter((p) => p.storage_path)
      .map((p) => {
        const pathParts = p.storage_path!.split('/');
        const fileName = pathParts[pathParts.length - 1];
        return `${user.id}/${fileName}`;
      });

    if (storagePaths.length > 0) {
      await supabase.storage.from('user-photos').remove(storagePaths);
    }

    // Then delete photo records using bulk RPC
    const { error } = await supabase.rpc('bulk_delete_photos', {
      p_photo_ids: photoIds,
    });

    if (error) {
      throw new Error(error.message || 'Failed to delete photos');
    }

    // Reset dirty state after successful deletion
    photoEditDirtyRef.current = false;
    setHasUnsavedChanges(false);

    setSelectedPhotoIds(new Set());
    await fetchPhotos();
    refreshCounts();
  };

  const handleAddToAlbum = (photoIds: string[]) => {
    const photosToAdd = photos.filter((p) => photoIds.includes(p.id));
    if (photosToAdd.length === 0) return;

    modalContext.setTitle('Add to Album');
    modalContext.setContent(
      <AddPhotosToAlbumModal
        photos={photosToAdd}
        onClose={() => modalContext.setIsOpen(false)}
        onSuccess={() => fetchPhotos()}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const handleReorderPhotos = async (newPhotos: Photo[]) => {
    setPhotos(newPhotos);

    const updates = newPhotos.map((photo, index) => ({
      id: photo.id,
      sort_order: index,
    }));

    await supabase.rpc('batch_update_photos', {
      photo_updates: updates,
    });
  };

  const handleUpload = async (files: File[]) => {
    if (!files || files.length === 0 || !user) return;

    setIsUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) throw new Error(`Invalid file type: ${file.name}`);
        if (file.size > 5 * 1024 * 1024) throw new Error(`File too large: ${file.name}`);

        const fileExt = file.name.split('.').pop();
        const randomId = crypto.randomUUID();
        const fileName = `${randomId}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-photos')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw new Error(`Upload failed: ${file.name}`);

        const { data: { publicUrl } } = supabase.storage.from('user-photos').getPublicUrl(filePath);

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new window.Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = URL.createObjectURL(file);
        });

        let exifData = null;
        try {
          exifData = await exifr.parse(file, {
            pick: ['Make', 'Model', 'DateTimeOriginal', 'ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'LensModel', 'GPSLatitude', 'GPSLongitude'],
          });
        } catch { /* ignore */ }

        const { error: insertError } = await supabase.from('photos').insert({
          storage_path: filePath,
          url: publicUrl,
          width: img.width,
          height: img.height,
          file_size: file.size,
          mime_type: file.type,
          exif_data: exifData,
          user_id: user.id,
          is_public: false,
          sort_order: photos.length,
        });

        if (insertError) throw new Error(`Failed to save photo: ${file.name}`);
      });

      await Promise.all(uploadPromises);
      await fetchPhotos();
      refreshCounts();
    } catch (err: any) {
      console.error('Upload error:', err);
      alert(err.message || 'Failed to upload photos');
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(Array.from(files));
    }
  };

  const selectedPhotos = photos.filter((p) => selectedPhotoIds.has(p.id));

  return (
    <ManageLayout
      actions={
        <>
          <select
            value={photoFilter}
            onChange={(e) => setPhotoFilter(e.target.value as 'all' | 'public' | 'private')}
            className="rounded-lg border border-border-color bg-background px-3 py-1.5 text-sm transition-colors focus:border-primary focus:outline-none"
          >
            <option value="all">All photos</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            icon={<PlusSVG className="size-5 -ml-0.5" />}
            variant="primary"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
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
    >
      <DropZone
        onDrop={handleUpload}
        disabled={isUploading}
        className="flex-1 flex flex-col min-h-0"
        overlayMessage="Drop to upload"
      >
        {photosLoading ? (
          <PageLoading message="Loading photos..." />
        ) : photos.length === 0 ? (
          <div className="border-2 border-dashed border-border-color p-12 text-center m-4 h-full flex flex-col items-center justify-center">
            <ImageSVG className="size-10 mb-2 inline-block" />
            <p className="mb-2 text-lg opacity-70">You don&apos;t have any photos yet</p>
            <p className="text-sm text-foreground/50 mb-4">
                Drag and drop photos here, or use the &quot;Upload&quot; buttons to upload photos
            </p>
            <Button onClick={() => fileInputRef.current?.click()} icon={<PlusSVG className="size-5 -ml-0.5" />}>Upload</Button>
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
          />
        )}
      </DropZone>
    </ManageLayout>
  );
}
