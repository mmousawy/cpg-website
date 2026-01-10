'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import type { Photo } from '@/types/photos';
import { createClient } from '@/utils/supabase/client';
import { useContext, useEffect, useMemo, useState } from 'react';
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
  const modalContext = useContext(ModalContext);
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
        .is('deleted_at', null)
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
      // Use RPC to add photos - handles sort_order assignment automatically
      const { error: rpcError } = await supabase.rpc('add_photos_to_album', {
        p_album_id: albumId,
        p_photo_ids: Array.from(selectedPhotoIds),
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Failed to add photos to album');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add photos to album');
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
          onClick={handleAddToAlbum}
          disabled={isAdding || selectedPhotoIds.size === 0}
          loading={isAdding}
        >
          Add {selectedPhotoIds.size > 0 ? `${selectedPhotoIds.size} ` : ''}photo{selectedPhotoIds.size !== 1 ? 's' : ''}
        </Button>
      </div>,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhotoIds.size, isAdding, onClose]);

  return (
    <div className="flex h-[60vh] flex-col bg-background-medium border border-border-color-strong">
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
  );
}
