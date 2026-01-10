'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import PhotoListItem from '@/components/manage/PhotoListItem';
import Button from '@/components/shared/Button';
import Checkbox from '@/components/shared/Checkbox';
import { useAuth } from '@/hooks/useAuth';
import type { Album } from '@/types/albums';
import type { PhotoWithAlbums } from '@/types/photos';
import { createClient } from '@/utils/supabase/client';
import clsx from 'clsx';
import Image from 'next/image';
import { useContext, useEffect, useMemo, useState } from 'react';

type AlbumWithCount = Album & { photo_count?: number };

import FolderSVG from 'public/icons/folder.svg';
import PlusSVG from 'public/icons/plus.svg';

interface AddPhotosToAlbumModalProps {
  photos: PhotoWithAlbums[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPhotosToAlbumModal({
  photos,
  onClose,
  onSuccess,
}: AddPhotosToAlbumModalProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const modalContext = useContext(ModalContext);
  const [albums, setAlbums] = useState<AlbumWithCount[]>([]);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);

  // Calculate which albums already contain ALL selected photos
  const albumsWithAllPhotos = useMemo(() => {
    if (photos.length === 0) return new Set<string>();

    // Get album IDs for each photo
    const albumIdsByPhoto = photos.map((photo) =>
      new Set(photo.albums?.map((a) => a.id) || []),
    );

    // Find albums that appear in ALL photos
    if (albumIdsByPhoto.length === 0) return new Set<string>();

    // Start with the first photo's albums and intersect with the rest
    const commonAlbumIds = new Set<string>();
    const firstPhotoAlbums = albumIdsByPhoto[0];

    for (const albumId of firstPhotoAlbums) {
      if (albumIdsByPhoto.every((albumSet) => albumSet.has(albumId))) {
        commonAlbumIds.add(albumId);
      }
    }

    return commonAlbumIds;
  }, [photos]);

  // Reset selection and refetch albums when modal opens with new photos
  useEffect(() => {
    setSelectedAlbumIds(new Set());
    setError(null);
    if (user) {
      fetchAlbums();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, user]);

  const fetchAlbums = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('id, title, slug, cover_image_url, album_photos(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching albums:', error);
      } else {
        // Transform to include photo_count
        const albumsWithCount = (data || []).map((album: any) => ({
          ...album,
          photo_count: album.album_photos?.[0]?.count ?? 0,
        }));
        setAlbums(albumsWithCount as AlbumWithCount[]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
    setIsLoading(false);
  };

  const handleToggleAlbum = (albumId: string) => {
    setSelectedAlbumIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(albumId)) {
        newSet.delete(albumId);
      } else {
        newSet.add(albumId);
      }
      return newSet;
    });
  };

  const handleCreateAlbum = async () => {
    if (!user || !newAlbumTitle.trim()) return;

    setIsCreatingAlbum(true);
    try {
      const slug = newAlbumTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { data: newAlbum, error } = await supabase
        .from('albums')
        .insert({
          user_id: user.id,
          title: newAlbumTitle.trim(),
          slug,
          is_public: true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to create album');
      }

      setAlbums([newAlbum as Album, ...albums]);
      setSelectedAlbumIds((prev) => new Set([...prev, newAlbum.id]));
      setNewAlbumTitle('');
    } catch (err: any) {
      console.error('Error creating album:', err);
      setError(err.message || 'Failed to create album');
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  const handleAddToAlbums = async () => {
    if (!user || selectedAlbumIds.size === 0) return;

    setIsAdding(true);
    setError(null);

    try {
      const photoIds = photos.map((p) => p.id);

      // Use RPC to add photos to each selected album
      // RPC handles deduplication and sort_order assignment
      const promises = Array.from(selectedAlbumIds).map((albumId) =>
        supabase.rpc('add_photos_to_album', {
          p_album_id: albumId,
          p_photo_ids: photoIds,
        }),
      );

      const results = await Promise.all(promises);

      // Check for any errors
      const firstError = results.find((r) => r.error);
      if (firstError?.error) {
        throw new Error(firstError.error.message || 'Failed to add photos to album');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add photos to albums');
    } finally {
      setIsAdding(false);
    }
  };

  // Set footer with action buttons
  useEffect(() => {
    modalContext.setFooter(
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={isAdding}>
          Cancel
        </Button>
        <Button
          onClick={handleAddToAlbums}
          disabled={isAdding || selectedAlbumIds.size === 0}
          loading={isAdding}
        >
          {selectedAlbumIds.size === 0 ? 'Select an album' : `Add to ${selectedAlbumIds.size} album${selectedAlbumIds.size !== 1 ? 's' : ''}`}
        </Button>
      </div>,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlbumIds.size, isAdding, onClose]);

  return (
    <div className="flex flex-col select-none">
      <div className="mb-4">
        <p className="text-sm text-foreground/80">Selected {photos.length} photos</p>
      </div>

      {/* Preview of photos being added */}
      <div className="mb-4 grid min-h-12.5 max-h-[30svh] grid-cols-3 gap-2 overflow-y-auto">
        {photos.map((photo) => (
          <PhotoListItem key={photo.id} photo={photo} variant="compact" />
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <p className="mb-4 text-sm text-foreground/80">
          Select which album(s) to add {photos.length === 1 ? 'this photo' : `these photos`} to:
      </p>

      <div className="mb-4 flex-1">
        {isLoading ? (
          <div className="h-14 flex items-center justify-center text-center">
            <p className="text-foreground/50">Loading albums...</p>
          </div>
        ) : albums.length === 0 ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-foreground/80">No albums yet</p>
            <p className="text-sm text-foreground/50">
              Create your first album below
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {albums.map((album) => {
              const isAlreadyAdded = albumsWithAllPhotos.has(album.id);
              const isSelected = isAlreadyAdded || selectedAlbumIds.has(album.id);
              return (
                <div
                  key={album.id}
                  onClick={() => !isAlreadyAdded && handleToggleAlbum(album.id)}
                  className={clsx(
                    'group flex items-center pr-3 transition-all',
                    isAlreadyAdded
                      ? 'cursor-not-allowed opacity-60 ring-1 ring-border-color-strong bg-background'
                      : isSelected
                        ? 'cursor-pointer ring-2 ring-primary ring-offset-1 dark:ring-offset-white/50'
                        : 'cursor-pointer ring-1 ring-border-color-strong hover:ring-2 hover:ring-primary/50',
                  )}
                >
                  {/* Album thumbnail - matches AlbumMiniCard */}
                  <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden bg-background">
                    {album.cover_image_url ? (
                      <Image
                        src={album.cover_image_url}
                        alt={album.title}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <FolderSVG className="size-6 text-foreground/30" />
                    )}
                  </div>
                  <div className="ml-2 flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium line-clamp-2 leading-none">{album.title}</span>
                    {album.photo_count !== undefined && (
                      <span className="text-xs text-foreground/50">
                        {album.photo_count} photo{album.photo_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <Checkbox
                    checked={isSelected}
                    disabled={isAlreadyAdded}
                    onChange={() => handleToggleAlbum(album.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create new album */}
      <div className="pl-3 py-1 border-l-2 border-border-color-strong">
        <label className="mb-2 block text-sm text-foreground/80">
          Or create a new album
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newAlbumTitle}
            onChange={(e) => setNewAlbumTitle(e.target.value)}
            placeholder="Album title"
            className="flex-1 rounded-lg border border-border-color bg-background-medium px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateAlbum();
              }
            }}
          />
          <Button
            onClick={handleCreateAlbum}
            disabled={!newAlbumTitle.trim() || isCreatingAlbum}
            loading={isCreatingAlbum}
            size="sm"
            icon={<PlusSVG className="size-4" />}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
