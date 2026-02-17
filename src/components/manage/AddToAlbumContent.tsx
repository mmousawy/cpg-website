'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import type { Photo } from '@/types/photos';
import { useContext, useEffect, useMemo, useState } from 'react';
import PhotoGrid from './PhotoGrid';

interface AddToAlbumContentProps {
  albumId: string;
  existingPhotoUrls: string[];
  onClose: () => void;
  onSuccess: () => void;
  /** Use shared album RPC instead of owned album RPC */
  isSharedAlbum?: boolean;
}

export default function AddToAlbumContent({
  albumId,
  existingPhotoUrls,
  onClose,
  onSuccess,
  isSharedAlbum = false,
}: AddToAlbumContentProps) {
  const { user } = useAuth();
  const supabase = useSupabase();
  const modalContext = useContext(ModalContext);
  const [photos, setPhotos] = useState<Photo[]>([]);
  /** Array preserves selection order (Set would lose it, causing reversed order in album) */
  const [selectedPhotoIdsOrder, setSelectedPhotoIdsOrder] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchPhotos = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('photos')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .not('storage_path', 'like', 'events/%')
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

    fetchPhotos();
  }, [user, supabase]);

  // Filter out photos already in the album
  const availablePhotos = useMemo(
    () => photos.filter((p) => !existingPhotoUrls.includes(p.url)),
    [photos, existingPhotoUrls],
  );

  const handleSelectPhoto = (photoId: string, _isMultiSelect: boolean) => {
    setSelectedPhotoIdsOrder((prev) => {
      const idx = prev.indexOf(photoId);
      if (idx >= 0) {
        return prev.filter((id) => id !== photoId);
      }
      return [...prev, photoId];
    });
  };

  const handleClearSelection = () => {
    setSelectedPhotoIdsOrder([]);
  };

  const handleSelectMultiple = (ids: string[]) => {
    setSelectedPhotoIdsOrder((prev) => {
      const next = [...prev];
      for (const id of ids) {
        if (!next.includes(id)) next.push(id);
      }
      return next;
    });
  };

  const selectedPhotoIdsSet = useMemo(
    () => new Set(selectedPhotoIdsOrder),
    [selectedPhotoIdsOrder],
  );

  const handleAddToAlbum = async () => {
    if (!user || selectedPhotoIdsOrder.length === 0) return;

    setIsAdding(true);
    setError(null);

    try {
      // Use RPC to add photos - handles sort_order assignment automatically
      const rpcName = isSharedAlbum ? 'add_photos_to_shared_album' : 'add_photos_to_album';
      const { error: rpcError } = await supabase.rpc(rpcName, {
        p_album_id: albumId,
        p_photo_ids: selectedPhotoIdsOrder,
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Failed to add photos to album');
      }

      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add photos to album';
      setError(message);
    } finally {
      setIsAdding(false);
    }
  };

  // Set footer with action buttons
  useEffect(() => {
    modalContext.setFooter(
      <div
        className="flex justify-end gap-2"
      >
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isAdding}
        >
          Cancel
        </Button>
        <Button
          onClick={handleAddToAlbum}
          disabled={isAdding || selectedPhotoIdsOrder.length === 0}
          loading={isAdding}
        >
          Add
          {' '}
          {selectedPhotoIdsOrder.length > 0 ? `${selectedPhotoIdsOrder.length} ` : ''}
          photo
          {selectedPhotoIdsOrder.length !== 1 ? 's' : ''}
        </Button>
      </div>,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- modalContext is stable, including it causes infinite re-renders
  }, [selectedPhotoIdsOrder.length, isAdding, onClose]);

  return (
    <div
      className="flex h-[60vh] flex-col bg-background-medium border border-border-color-strong"
    >
      {error && (
        <div
          className="shrink-0 mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
        >
          {error}
        </div>
      )}

      <div
        className="flex-1 min-h-0 overflow-y-auto relative"
      >
        {isLoading ? (
          <div
            className="flex items-center justify-center h-full"
          >
            <p
              className="text-foreground/50"
            >
              Loading photos...
            </p>
          </div>
        ) : availablePhotos.length === 0 ? (
          <div
            className="flex items-center justify-center h-full"
          >
            <p
              className="text-foreground/70"
            >
              No photos available to add
            </p>
          </div>
        ) : (
          <PhotoGrid
            photos={availablePhotos}
            selectedPhotoIds={selectedPhotoIdsSet}
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
