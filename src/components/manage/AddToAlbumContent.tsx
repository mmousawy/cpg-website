'use client';

import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import type { Photo } from '@/types/photos';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import PhotoGrid from './PhotoGrid';

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

  // Filter out photos already in the album
  const availablePhotos = useMemo(
    () => photos.filter((p) => !existingPhotoUrls.includes(p.url)),
    [photos, existingPhotoUrls],
  );

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
        if (newSet.has(photoId)) {
          newSet.delete(photoId);
        } else {
          newSet.add(photoId);
        }
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedPhotoIds(new Set());
  };

  const handleSelectMultiple = (ids: string[]) => {
    setSelectedPhotoIds((prev) => {
      const newSet = new Set(prev);
      ids.forEach((id) => newSet.add(id));
      return newSet;
    });
  };

  const handleAddToAlbum = async () => {
    if (!user || selectedPhotoIds.size === 0) return;

    setIsAdding(true);
    setError(null);

    try {
      const selectedPhotos = photos.filter((p) => selectedPhotoIds.has(p.id));

      // Get album info to check if it needs a cover image
      const { data: albumData } = await supabase
        .from('albums')
        .select('cover_image_url')
        .eq('id', albumId)
        .single();

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
        photo_id: photo.id,
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

      // Set cover image if album doesn't have one
      if (!albumData?.cover_image_url && selectedPhotos.length > 0) {
        await supabase
          .from('albums')
          .update({ cover_image_url: selectedPhotos[0].url })
          .eq('id', albumId);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add photos to album');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <div className="flex h-[calc(100vh-12rem)] md:h-[calc(100vh-13rem)] flex-col bg-background-medium border border-border-color-strong">
        {error && (
          <div className="shrink-0 mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-foreground/50">Loading photos...</p>
            </div>
          ) : availablePhotos.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-foreground/70">No photos available to add</p>
            </div>
          ) : (
            <PhotoGrid
              photos={availablePhotos}
              selectedPhotoIds={selectedPhotoIds}
              onSelectPhoto={handleSelectPhoto}
              onPhotoClick={(photo) => handleSelectPhoto(photo.id, true)}
              onClearSelection={handleClearSelection}
              onSelectMultiple={handleSelectMultiple}
              sortable={false}
            />
          )}
        </div>

      </div>
      <div className="shrink-0 flex justify-end gap-2 mt-4">
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
    </>
  );
}
