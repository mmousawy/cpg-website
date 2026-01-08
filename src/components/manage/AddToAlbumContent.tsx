'use client';

import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import type { Photo } from '@/types/photos';
import { createClient } from '@/utils/supabase/client';
import clsx from 'clsx';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface AddToAlbumContentProps {
  albumId: string;
  existingPhotoUrls: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddToAlbumContent({
  albumId,
  existingPhotoUrls,
  onClose,
  onSuccess,
}: AddToAlbumContentProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchPhotos = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching photos:', error);
      } else {
        setPhotos((data || []) as Photo[]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
    setIsLoading(false);
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

  const handleAddToAlbum = async () => {
    if (!user || selectedPhotoIds.size === 0) return;

    setIsAdding(true);
    setError(null);

    try {
      const selectedPhotos = photos.filter((p) => selectedPhotoIds.has(p.id));
      const photoUrls = selectedPhotos.map((p) => p.url);

      // Get current max sort_order
      const { data: existingPhotos } = await supabase
        .from('album_photos')
        .select('sort_order')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxSortOrder = existingPhotos?.[0]?.sort_order ?? -1;

      // Insert album_photos
      const inserts = selectedPhotos.map((photo, index) => ({
        album_id: albumId,
        photo_url: photo.url,
        width: photo.width,
        height: photo.height,
        sort_order: maxSortOrder + 1 + index,
      }));

      const { error: insertError } = await supabase
        .from('album_photos')
        .insert(inserts);

      if (insertError) {
        throw new Error(insertError.message || 'Failed to add photos to album');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add photos to album');
    } finally {
      setIsAdding(false);
    }
  };

  const availablePhotos = photos.filter((p) => !existingPhotoUrls.includes(p.url));

  return (
    <div className="max-h-[80vh] flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Add Photos to Album</h2>
        <p className="text-sm text-foreground/70">
          Select photos from your library to add to this album
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto mb-4">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-foreground/50">Loading photos...</p>
          </div>
        ) : availablePhotos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-foreground/70">No photos available to add</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {availablePhotos.map((photo) => {
              const isSelected = selectedPhotoIds.has(photo.id);
              return (
                <div
                  key={photo.id}
                  className={clsx(
                    'relative cursor-pointer overflow-hidden transition-all group',
                    isSelected
                      ? 'ring-2 ring-primary ring-offset-2'
                      : 'hover:ring-2 hover:ring-primary/50',
                  )}
                  onClick={() => handleSelectPhoto(photo.id, false)}
                >
                  {/* Checkbox */}
                  <div
                    className={clsx(
                      'absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded border-2 bg-background transition-all',
                      isSelected
                        ? 'border-primary bg-primary text-white'
                        : 'border-white/80 bg-white/60 opacity-0 group-hover:opacity-100',
                    )}
                  >
                    {isSelected && (
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="aspect-square overflow-hidden bg-background-light">
                    <Image
                      src={`${photo.url}?width=300&height=300&resize=cover`}
                      alt={photo.title || 'Photo'}
                      width={300}
                      height={300}
                      className="size-full object-cover"
                      draggable={false}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border-color pt-4">
        <Button variant="secondary" onClick={onClose} disabled={isAdding}>
          Cancel
        </Button>
        <Button
          onClick={handleAddToAlbum}
          disabled={isAdding || selectedPhotoIds.size === 0}
          loading={isAdding}
        >
          Add {selectedPhotoIds.size > 0 ? `${selectedPhotoIds.size} ` : ''}Photo{selectedPhotoIds.size !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
