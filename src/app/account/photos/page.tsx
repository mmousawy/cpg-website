'use client';

import AlbumGrid from '@/components/album/AlbumGrid';
import type { PhotoFormData } from '@/components/photo/PhotoEditSidebar';
import PhotoEditSidebar from '@/components/photo/PhotoEditSidebar';
import PhotoGrid from '@/components/photo/PhotoGrid';
import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import type { AlbumWithPhotos } from '@/types/albums';
import type { Photo } from '@/types/photos';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import FolderSVG from 'public/icons/folder.svg';
import ImageSVG from 'public/icons/image.svg';
import PlusSVG from 'public/icons/plus.svg';

type ViewMode = 'photos' | 'albums';

export default function ManagePhotosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

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

  const selectedPhotos = photos.filter((p) => selectedPhotoIds.has(p.id));

  return (
    <div className="flex h-[calc(100svh-81px)] w-full">
      {/* Left Panel - Content */}
      <div className="flex-1 overflow-y-auto border-r border-border-color">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border-color bg-background px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Tab buttons */}
            <div className="flex gap-1 rounded-lg border border-border-color bg-background-light p-1">
              <button
                onClick={() => setViewMode('photos')}
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
                onClick={() => setViewMode('albums')}
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
              <Button
                href={viewMode === 'photos' ? '/account/upload' : '/account/galleries/new'}
                icon={<PlusSVG className="size-5 -ml-0.5" />}
                variant="primary"
              >
                {viewMode === 'photos' ? 'Upload' : 'New Album'}
              </Button>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6">
          {viewMode === 'photos' ? (
            photosLoading ? (
              <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
                <p className="opacity-70">Loading photos...</p>
              </div>
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
              />
            )
          ) : albumsLoading ? (
            <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
              <p className="opacity-70">Loading albums...</p>
            </div>
          ) : albums.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border-color p-12 text-center">
              <p className="mb-4 text-lg opacity-70">No albums yet</p>
              <Button href="/account/galleries/new" icon={<PlusSVG className="size-5 -ml-0.5" />}>
                Create your first album
              </Button>
            </div>
          ) : (
            <AlbumGrid albums={albums} isOwner />
          )}
        </div>
      </div>

      {/* Right Panel - Sidebar */}
      <div className="w-[400px] shrink-0 overflow-y-auto bg-background-light">
        {viewMode === 'photos' ? (
          <PhotoEditSidebar
            selectedPhotos={selectedPhotos}
            onSave={handleSavePhoto}
            onDelete={handleDeletePhoto}
            onAddToAlbum={handleAddToAlbum}
            isLoading={photosLoading}
          />
        ) : (
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Album Settings</h2>
            <p className="text-sm opacity-70">
              Click on an album to edit it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
