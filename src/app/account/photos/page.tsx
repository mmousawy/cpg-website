'use client';

import { revalidateAlbum } from '@/app/actions/revalidate';
import {
  AddToAlbumContent,
  AlbumEditEmptyState,
  AlbumEditSidebar,
  AlbumGrid,
  AlbumPhotoGrid,
  PhotoEditEmptyState,
  PhotoEditSidebar,
  PhotoGrid,
  type AlbumFormData,
  type PhotoFormData,
} from '@/components/manage';
import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import type { Album, AlbumPhoto, AlbumWithPhotos } from '@/types/albums';
import type { Photo } from '@/types/photos';
import { createClient } from '@/utils/supabase/client';
import exifr from 'exifr';
import { useRouter } from 'next/navigation';
import { useContext, useEffect, useRef, useState } from 'react';

import { ModalContext } from '@/app/providers/ModalProvider';

import PageLoading from '@/components/shared/PageLoading';
import ArrowLeftSVG from 'public/icons/arrow-left.svg';
import FolderSVG from 'public/icons/folder.svg';
import ImageSVG from 'public/icons/image.svg';
import PlusSVG from 'public/icons/plus.svg';

type ViewMode = 'photos' | 'albums' | 'album-detail';

export default function ManagePhotosPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContext = useContext(ModalContext);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('photos');

  // Photos state
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [photosLoading, setPhotosLoading] = useState(true);

  const [photoFilter, setPhotoFilter] = useState<'all' | 'public' | 'private'>('all');

  // Albums state
  const [albums, setAlbums] = useState<AlbumWithPhotos[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isNewAlbum, setIsNewAlbum] = useState(false);

  // Album detail state (when viewing an album's photos)
  const [albumPhotos, setAlbumPhotos] = useState<AlbumPhoto[]>([]);
  const [albumPhotosLoading, setAlbumPhotosLoading] = useState(false);
  const [selectedAlbumPhotoIds, setSelectedAlbumPhotoIds] = useState<Set<string>>(new Set());
  const [photosMetadata, setPhotosMetadata] = useState<Map<string, Photo>>(new Map());
  const [isUploading, setIsUploading] = useState(false);

  // Fetch photos
  useEffect(() => {
    if (!user) return;
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, photoFilter]);

  // Fetch albums
  useEffect(() => {
    if (!user) return;
    fetchAlbums();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchPhotos = async () => {
    if (!user) return;

    setPhotosLoading(true);
    try {
      let query = supabase
        .from('photos')
        .select('*')
        .eq('user_id', user.id)
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
        setPhotos((data || []) as Photo[]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
    setPhotosLoading(false);
  };

  const fetchAlbums = async () => {
    if (!user) return;

    setAlbumsLoading(true);
    try {
      const { data, error } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          description,
          slug,
          cover_image_url,
          is_public,
          created_at,
          user_id,
          photos:album_photos(id, photo_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching albums:', error);
      } else {
        setAlbums((data || []) as unknown as AlbumWithPhotos[]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
    setAlbumsLoading(false);
  };

  const fetchAlbumPhotos = async (albumId: string) => {
    if (!user) return;

    setAlbumPhotosLoading(true);
    try {
      const { data: photosData, error: photosError } = await supabase
        .from('album_photos')
        .select('id, album_id, photo_url, title, width, height, sort_order')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: true });

      if (photosError) {
        console.error('Error fetching album photos:', photosError);
      } else {
        setAlbumPhotos(photosData as AlbumPhoto[]);

        // Fetch photo metadata
        const photoUrls = photosData.map((p) => p.photo_url);
        if (photoUrls.length > 0) {
          const { data: photosMetadataData } = await supabase
            .from('photos')
            .select('*')
            .in('url', photoUrls);

          if (photosMetadataData) {
            const metadataMap = new Map<string, Photo>();
            photosMetadataData.forEach((p) => {
              metadataMap.set(p.url, p as Photo);
            });
            setPhotosMetadata(metadataMap);
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
    setAlbumPhotosLoading(false);
  };

  const handleSelectPhoto = (photoId: string, isMultiSelect: boolean) => {
    setSelectedPhotoIds((prev) => {
      const newSet = new Set(prev);
      if (isMultiSelect) {
        if (newSet.has(photoId)) {
          newSet.delete(photoId);
        } else {
          newSet.add(photoId);
        }
      } else {
        newSet.clear();
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const handleSelectAlbumPhoto = (photoId: string, isMultiSelect: boolean) => {
    setSelectedAlbumPhotoIds((prev) => {
      const newSet = new Set(prev);
      if (isMultiSelect) {
        if (newSet.has(photoId)) {
          newSet.delete(photoId);
        } else {
          newSet.add(photoId);
        }
      } else {
        newSet.clear();
        newSet.add(photoId);
      }
      return newSet;
    });
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
      .eq('user_id', user.id);

    if (error) {
      throw new Error(error.message || 'Failed to save photo');
    }

    await fetchPhotos();
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!user) return;

    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    // Delete from storage
    if (photo.storage_path) {
      const pathParts = photo.storage_path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const filePath = `${user.id}/${fileName}`;
      await supabase.storage.from('user-photos').remove([filePath]);
    }

    // Delete from database
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(error.message || 'Failed to delete photo');
    }

    setSelectedPhotoIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
    await fetchPhotos();
  };

  const handleAddToAlbum = (photoIds: string[]) => {
    // TODO: Open add-to-album modal
    console.log('Add to album:', photoIds);
  };

  const handleAlbumClick = (album: AlbumWithPhotos) => {
    setSelectedAlbum(album);
    setIsNewAlbum(false);
    setSelectedAlbumPhotoIds(new Set());
    setViewMode('album-detail');
    fetchAlbumPhotos(album.id);
  };

  const handleBackToAlbums = () => {
    setViewMode('albums');
    setSelectedAlbum(null);
    setAlbumPhotos([]);
    setSelectedAlbumPhotoIds(new Set());
    setPhotosMetadata(new Map());
  };

  const handleCreateNewAlbum = () => {
    setSelectedAlbum(null);
    setIsNewAlbum(true);
    setViewMode('album-detail');
    setAlbumPhotos([]);
    setSelectedAlbumPhotoIds(new Set());
  };

  const handleSaveAlbum = async (data: AlbumFormData) => {
    if (!user) return;

    if (isNewAlbum) {
      // Create new album
      const { data: newAlbum, error: createError } = await supabase
        .from('albums')
        .insert({
          user_id: user.id,
          title: data.title.trim(),
          slug: data.slug.trim(),
          description: data.description?.trim() || null,
          is_public: data.isPublic,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message || 'Failed to create album');
      }

      // Add tags for new album
      if (data.tags.length > 0 && newAlbum) {
        await supabase
          .from('album_tags')
          .insert(data.tags.map(tag => ({
            album_id: newAlbum.id,
            tag: tag.toLowerCase(),
          })));
      }

      // Revalidate and refresh
      if (profile?.nickname) {
        await revalidateAlbum(profile.nickname, data.slug);
      }
      await fetchAlbums();
      setSelectedAlbum(newAlbum as Album);
      setIsNewAlbum(false);
    } else if (selectedAlbum) {
      // Update existing album
      const { error: updateError } = await supabase
        .from('albums')
        .update({
          title: data.title.trim(),
          slug: data.slug.trim(),
          description: data.description?.trim() || null,
          is_public: data.isPublic,
          cover_image_url: albumPhotos.length > 0 ? albumPhotos[0].photo_url : selectedAlbum.cover_image_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedAlbum.id);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update album');
      }

      // Update tags
      await supabase
        .from('album_tags')
        .delete()
        .eq('album_id', selectedAlbum.id);

      if (data.tags.length > 0) {
        await supabase
          .from('album_tags')
          .insert(data.tags.map(tag => ({
            album_id: selectedAlbum.id,
            tag: tag.toLowerCase(),
          })));
      }

      // Update photo sort order
      if (albumPhotos.length > 0) {
        const updates = albumPhotos.map((photo, index) => ({
          id: photo.id,
          album_id: photo.album_id,
          photo_url: photo.photo_url,
          width: photo.width,
          height: photo.height,
          title: photo.title,
          sort_order: index,
        }));

        await supabase
          .from('album_photos')
          .upsert(updates, { onConflict: 'id' });
      }

      // Revalidate
      if (profile?.nickname) {
        await revalidateAlbum(profile.nickname, data.slug);
      }
      await fetchAlbums();

      // Update local album reference
      setSelectedAlbum({
        ...selectedAlbum,
        title: data.title.trim(),
        slug: data.slug.trim(),
        description: data.description?.trim() || null,
        is_public: data.isPublic,
      });
    }
  };

  const handleDeleteAlbum = async () => {
    if (!selectedAlbum || !user) return;

    // Delete all photos first
    await supabase.from('album_photos').delete().eq('album_id', selectedAlbum.id);
    // Delete all tags
    await supabase.from('album_tags').delete().eq('album_id', selectedAlbum.id);
    // Delete the album
    const { error: deleteError } = await supabase.from('albums').delete().eq('id', selectedAlbum.id);

    if (deleteError) {
      throw new Error(deleteError.message || 'Failed to delete album');
    }

    // Revalidate
    if (profile?.nickname) {
      await revalidateAlbum(profile.nickname, selectedAlbum.slug);
    }

    await fetchAlbums();
    handleBackToAlbums();
  };

  const handleReorderAlbumPhotos = async (newPhotos: AlbumPhoto[]) => {
    // Update local state immediately for responsiveness
    setAlbumPhotos(newPhotos);

    // Single RPC call to batch update sort_order
    const updates = newPhotos.map((photo, index) => ({
      id: photo.id,
      sort_order: index,
    }));

    await supabase.rpc('batch_update_album_photos', {
      photo_updates: updates,
    });
  };

  const handleReorderPhotos = async (newPhotos: Photo[]) => {
    // Update local state immediately for responsiveness
    setPhotos(newPhotos);

    // Single RPC call to batch update sort_order
    const updates = newPhotos.map((photo, index) => ({
      id: photo.id,
      sort_order: index,
    }));

    await supabase.rpc('batch_update_photos', {
      photo_updates: updates,
    });
  };

  const handleSaveAlbumPhoto = async (photoId: string, data: PhotoFormData) => {
    if (!user || !selectedAlbum) return;

    const photo = albumPhotos.find((p) => p.id === photoId);
    if (!photo) return;

    // Update album_photo title
    await supabase
      .from('album_photos')
      .update({ title: data.title })
      .eq('id', photoId);

    // Also update the photo metadata if it exists
    const photoMetadata = photosMetadata.get(photo.photo_url);
    if (photoMetadata) {
      await supabase
        .from('photos')
        .update({
          title: data.title,
          description: data.description,
          is_public: data.is_public,
        })
        .eq('id', photoMetadata.id);
    }

    await fetchAlbumPhotos(selectedAlbum.id);
  };

  const handleDeleteAlbumPhoto = async (photoId: string) => {
    if (!selectedAlbum) return;

    await supabase
      .from('album_photos')
      .delete()
      .eq('id', photoId);

    setSelectedAlbumPhotoIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });

    await fetchAlbumPhotos(selectedAlbum.id);
  };

  const handleAddPhotosToAlbum = () => {
    if (!selectedAlbum) return;

    modalContext.setTitle('Add Photos from Library');
    modalContext.setContent(
      <AddToAlbumContent
        albumId={selectedAlbum.id}
        existingPhotoUrls={albumPhotos.map((p) => p.photo_url)}
        onClose={() => modalContext.setIsOpen(false)}
        onSuccess={() => {
          fetchAlbumPhotos(selectedAlbum.id);
          modalContext.setIsOpen(false);
        }}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const handleUploadToAlbum = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !selectedAlbum) return;

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Invalid file type: ${file.name}`);
        }

        // Validate file size (max 5 MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error(`File too large: ${file.name}`);
        }

        // Generate random filename
        const fileExt = file.name.split('.').pop();
        const randomId = crypto.randomUUID();
        const fileName = `${randomId}.${fileExt}`;
        const filePath = `${user.id}/${selectedAlbum.id}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('user-albums')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${file.name}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('user-albums')
          .getPublicUrl(filePath);

        // Get image dimensions
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new window.Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = URL.createObjectURL(file);
        });

        // Extract EXIF data
        let exifData = null;
        try {
          exifData = await exifr.parse(file, {
            pick: ['Make', 'Model', 'DateTimeOriginal', 'ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'LensModel', 'GPSLatitude', 'GPSLongitude'],
          });
        } catch (err) {
          console.warn('Failed to extract EXIF data:', err);
        }

        // Insert photo metadata first
        await supabase
          .from('photos')
          .insert({
            storage_path: filePath,
            url: publicUrl,
            width: img.width,
            height: img.height,
            file_size: file.size,
            mime_type: file.type,
            exif_data: exifData,
            user_id: user.id,
            is_public: false,
          });

        // Insert photo record
        const { data: photoData, error: insertError } = await supabase
          .from('album_photos')
          .insert({
            album_id: selectedAlbum.id,
            photo_url: publicUrl,
            width: img.width,
            height: img.height,
            sort_order: albumPhotos.length,
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to save photo: ${file.name}`);
        }

        return photoData as AlbumPhoto;
      });

      const newPhotos = await Promise.all(uploadPromises);

      // Update cover image if this is the first photo
      if (albumPhotos.length === 0 && newPhotos.length > 0) {
        await supabase
          .from('albums')
          .update({ cover_image_url: newPhotos[0].photo_url })
          .eq('id', selectedAlbum.id);
      }

      await fetchAlbumPhotos(selectedAlbum.id);
      await fetchAlbums();
    } catch (err: any) {
      console.error('Upload error:', err);
      alert(err.message || 'Failed to upload photos');
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectedPhotos = photos.filter((p) => selectedPhotoIds.has(p.id));

  const selectedAlbumPhotos: Photo[] = Array.from(selectedAlbumPhotoIds)
    .map((id) => {
      const albumPhoto = albumPhotos.find((p) => p.id === id);
      if (!albumPhoto) return null;
      const metadata = photosMetadata.get(albumPhoto.photo_url);
      if (!metadata) return null;
      return {
        ...metadata,
        title: albumPhoto.title || metadata.title,
      } as Photo;
    })
    .filter((p): p is Photo => p !== null);

  return (
    <div className="flex h-[calc(100svh-81px)] w-full select-none">
      {/* Left Panel - Content */}
      <div className="flex flex-col flex-1 overflow-y-auto border-r border-border-color">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border-color bg-background px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Tab buttons / Back button */}
            {viewMode === 'album-detail' ? (
              <div className="flex items-center gap-3 min-h-[2.875rem]">
                <button
                  onClick={handleBackToAlbums}
                  className="flex items-center gap-2 rounded-lg border border-border-color bg-background-light px-3 py-2 text-sm font-medium transition-colors hover:border-border-color-strong hover:bg-background"
                >
                  <ArrowLeftSVG className="size-4" />
                  Back
                </button>
                <h2 className="text-lg font-semibold">
                  {isNewAlbum ? 'New Album' : selectedAlbum?.title || 'Album'}
                </h2>
              </div>
            ) : (
              <div className="flex gap-1 rounded-lg border border-border-color bg-background-light p-1">
                <button
                  onClick={() => {
                    setViewMode('photos');
                    setSelectedPhotoIds(new Set());
                  }}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'photos'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-foreground/70 hover:text-foreground'
                  }`}
                >
                  <ImageSVG className="size-4" />
                  Photos ({photos.length})
                </button>
                <button
                  onClick={() => {
                    setViewMode('albums');
                    setSelectedAlbum(null);
                  }}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'albums'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-foreground/70 hover:text-foreground'
                  }`}
                >
                  <FolderSVG className="size-4" />
                  Albums ({albums.length})
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {viewMode === 'photos' && (
                <select
                  value={photoFilter}
                  onChange={(e) => setPhotoFilter(e.target.value as any)}
                  className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
                >
                  <option value="all">All photos</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              )}

              {viewMode === 'photos' && (
                <Button
                  href="/account/upload"
                  icon={<PlusSVG className="size-5 -ml-0.5" />}
                  variant="primary"
                >
                  Upload
                </Button>
              )}

              {viewMode === 'albums' && (
                <Button
                  onClick={handleCreateNewAlbum}
                  icon={<PlusSVG className="size-5 -ml-0.5" />}
                  variant="primary"
                >
                  New Album
                </Button>
              )}

              {viewMode === 'album-detail' && !isNewAlbum && (
                <>
                  <Button
                    onClick={handleAddPhotosToAlbum}
                    variant="secondary"
                  >
                    Add from library
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    icon={<PlusSVG className="size-5 -ml-0.5" />}
                    variant="primary"
                  >
                    {isUploading ? 'Uploading...' : 'Upload new'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={handleUploadToAlbum}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-grow">
          {viewMode === 'photos' ? (
            photosLoading ? (
              <PageLoading message="Loading photos..." />
            ) : photos.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-border-color p-12 text-center">
                <p className="mb-4 text-lg opacity-70">No photos yet</p>
                <Button href="/account/upload" icon={<PlusSVG className="size-5 -ml-0.5" />}>
                  Upload your first photo
                </Button>
              </div>
            ) : (
              <PhotoGrid
                photos={photos}
                selectedPhotoIds={selectedPhotoIds}
                onSelectPhoto={handleSelectPhoto}
                onPhotoClick={(photo) => handleSelectPhoto(photo.id, false)}
                onClearSelection={() => setSelectedPhotoIds(new Set())}
                onSelectMultiple={(ids) => setSelectedPhotoIds(new Set(ids))}
                onReorder={handleReorderPhotos}
                sortable
              />
            )
          ) : viewMode === 'albums' ? (
            albumsLoading ? (
              <PageLoading message="Loading albums..." />
            ) : albums.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-border-color p-12 text-center">
                <p className="mb-4 text-lg opacity-70">No albums yet</p>
                <Button onClick={handleCreateNewAlbum} icon={<PlusSVG className="size-5 -ml-0.5" />}>
                  Create your first album
                </Button>
              </div>
            ) : (
              <AlbumGrid albums={albums} onAlbumClick={handleAlbumClick} />
            )
          ) : (
            // Album detail view
            albumPhotosLoading ? (
              <PageLoading message="Loading photos..." />
            ) : isNewAlbum ? (
              <div className="rounded-lg border-2 border-dashed border-border-color p-12 text-center">
                <p className="mb-4 text-lg opacity-70">
                  Create your album first, then add photos
                </p>
              </div>
            ) : (
              <AlbumPhotoGrid
                photos={albumPhotos}
                selectedPhotoIds={selectedAlbumPhotoIds}
                onSelectPhoto={handleSelectAlbumPhoto}
                onReorder={handleReorderAlbumPhotos}
                onClearSelection={() => setSelectedAlbumPhotoIds(new Set())}
                onSelectMultiple={(ids) => setSelectedAlbumPhotoIds(new Set(ids))}
              />
            )
          )}
        </div>
      </div>

      {/* Right Panel - Sidebar */}
      <div className="w-[400px] shrink-0 overflow-y-auto bg-background-light">
        {viewMode === 'photos' ? (
          selectedPhotos.length > 0 ? (
            <PhotoEditSidebar
              selectedPhotos={selectedPhotos}
              onSave={handleSavePhoto}
              onDelete={handleDeletePhoto}
              onAddToAlbum={handleAddToAlbum}
              isLoading={photosLoading}
            />
          ) : (
            <PhotoEditEmptyState />
          )
        ) : viewMode === 'albums' ? (
          <AlbumEditEmptyState />
        ) : (
          // Album detail view - show photo edit or album settings
          selectedAlbumPhotos.length > 0 ? (
            <PhotoEditSidebar
              selectedPhotos={selectedAlbumPhotos}
              onSave={handleSaveAlbumPhoto}
              onDelete={handleDeleteAlbumPhoto}
              onAddToAlbum={() => {}}
              isLoading={albumPhotosLoading}
            />
          ) : (
            <AlbumEditSidebar
              album={selectedAlbum}
              isNewAlbum={isNewAlbum}
              nickname={profile?.nickname}
              onSave={handleSaveAlbum}
              onDelete={handleDeleteAlbum}
              isLoading={albumPhotosLoading}
            />
          )
        )}
      </div>
    </div>
  );
}
