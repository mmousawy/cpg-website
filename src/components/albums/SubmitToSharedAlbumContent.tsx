'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import { PhotoGrid, UploadingPhotoCard } from '@/components/manage';
import Button from '@/components/shared/Button';
import DropZone from '@/components/shared/DropZone';
import ErrorMessage from '@/components/shared/ErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import {
  useAddPhotosToSharedAlbum,
  useAlbumPhotoIds,
  useMyPhotoCountInAlbum,
} from '@/hooks/useSharedAlbumSubmissions';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { useSupabase } from '@/hooks/useSupabase';
import type { Photo } from '@/types/photos';
import { preloadImages } from '@/utils/preloadImages';
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import PhotoListItem from '@/components/manage/PhotoListItem';

import ImageSVG from 'public/icons/image.svg';
import PlusMiniSVG from 'public/icons/plus-mini.svg';

interface SubmitToSharedAlbumContentProps {
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  ownerNickname: string | null;
  maxPhotosPerUser?: number | null;
  onClose: () => void;
  onSuccess: (submittedCount: number, photoUrls: string[]) => void;
}

export default function SubmitToSharedAlbumContent({
  albumId,
  albumTitle,
  albumSlug,
  ownerNickname,
  maxPhotosPerUser,
  onClose,
  onSuccess,
}: SubmitToSharedAlbumContentProps) {
  const { user } = useAuth();
  const supabase = useSupabase();
  const modalContext = useContext(ModalContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [photos, setPhotos] = useState<Photo[]>([]);
  /** Array preserves selection/upload order (Set would lose it, causing reversed order in album) */
  const [selectedPhotoIdsOrder, setSelectedPhotoIdsOrder] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onCloseRef = useRef(onClose);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const { uploadingPhotos, uploadFiles, clearCompleted, dismissUpload } = usePhotoUpload();
  const isUploading = uploadingPhotos.some(
    (p) => p.status === 'uploading' || p.status === 'processing' || p.status === 'pending',
  );

  const { data: albumPhotoIds = [] } = useAlbumPhotoIds(albumId);
  const { data: myCountInAlbum = 0 } = useMyPhotoCountInAlbum(albumId, user?.id);
  const addMutation = useAddPhotosToSharedAlbum(albumId, ownerNickname, albumSlug);

  const alreadyInAlbumIds = useMemo(() => new Set(albumPhotoIds), [albumPhotoIds]);

  const remainingQuota = maxPhotosPerUser
    ? Math.max(0, maxPhotosPerUser - myCountInAlbum)
    : null;
  const hasReachedLimit = remainingQuota !== null && remainingQuota <= 0;

  const fetchPhotos = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .not('storage_path', 'like', 'events/%')
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        setError('Failed to load photos');
      } else {
        setPhotos((data || []) as Photo[]);
      }
    } catch {
      setError('Failed to load photos');
    }
    setIsLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const privatePhotoIds = useMemo(
    () => new Set(photos.filter((p) => !p.is_public).map((p) => p.id)),
    [photos],
  );

  const nonSelectablePhotoIds = useMemo(() => {
    const combined = new Set<string>();
    privatePhotoIds.forEach((id) => combined.add(id));
    alreadyInAlbumIds.forEach((id) => combined.add(id));
    return combined;
  }, [privatePhotoIds, alreadyInAlbumIds]);

  const handleSelectPhoto = (photoId: string) => {
    if (nonSelectablePhotoIds.has(photoId)) return;

    setSelectedPhotoIdsOrder((prev) => {
      const idx = prev.indexOf(photoId);
      if (idx >= 0) {
        return prev.filter((id) => id !== photoId);
      }
      if (remainingQuota !== null && prev.length >= remainingQuota) {
        return [photoId];
      }
      return [...prev, photoId];
    });
  };

  const handleClearSelection = () => setSelectedPhotoIdsOrder([]);

  const handleSelectMultiple = (ids: string[]) => {
    setSelectedPhotoIdsOrder((prev) => {
      const next = [...prev];
      for (const id of ids) {
        if (nonSelectablePhotoIds.has(id) || next.includes(id)) continue;
        if (remainingQuota !== null && next.length >= remainingQuota) break;
        next.push(id);
      }
      return next;
    });
  };

  const handleUpload = async (files: File[]) => {
    if (!files?.length || !user) return;

    try {
      const uploadedPhotos = await uploadFiles(files, user.id, supabase, {
        isPublic: true,
        sortOrderStart: photos.length,
      });

      if (uploadedPhotos.length > 0) {
        const photoUrls = uploadedPhotos.map((p) => p.url);
        await preloadImages(photoUrls);
      }

      await fetchPhotos();
      clearCompleted();

      if (uploadedPhotos.length > 0) {
        setSelectedPhotoIdsOrder((prev) => {
          const next = [...prev];
          for (const photo of uploadedPhotos) {
            if (remainingQuota !== null && next.length >= remainingQuota) break;
            if (!next.includes(photo.id)) next.push(photo.id);
          }
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photos');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) handleUpload(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectedPhotoIdsSet = useMemo(
    () => new Set(selectedPhotoIdsOrder),
    [selectedPhotoIdsOrder],
  );

  const selectedPhotos = useMemo(
    () =>
      selectedPhotoIdsOrder
        .map((id) => photos.find((p) => p.id === id))
        .filter((p): p is Photo => p != null),
    [photos, selectedPhotoIdsOrder],
  );

  const handleReview = useCallback(() => {
    if (selectedPhotoIdsOrder.length === 0) return;
    setShowConfirm(true);
  }, [selectedPhotoIdsOrder.length]);

  const handleReviewRef = useRef(handleReview);
  useEffect(() => {
    handleReviewRef.current = handleReview;
  }, [handleReview]);

  const infoText = useMemo(() => {
    if (hasReachedLimit) return `Maximum ${maxPhotosPerUser} reached`;
    if (selectedPhotoIdsOrder.length > 0) {
      if (remainingQuota !== null) {
        const remaining = remainingQuota - selectedPhotoIdsOrder.length;
        return `${remaining} more photo${remaining !== 1 ? 's' : ''} allowed`;
      }
      return `${selectedPhotoIdsOrder.length} photo${selectedPhotoIdsOrder.length !== 1 ? 's' : ''} selected`;
    }
    if (remainingQuota !== null) return `Max ${remainingQuota} photo${remainingQuota !== 1 ? 's' : ''}`;
    return 'Select photos from your library or upload new ones';
  }, [selectedPhotoIdsOrder.length, remainingQuota, hasReachedLimit, maxPhotosPerUser]);

  const footerContent = useMemo(
    () => (
      <div
        className="flex flex-col gap-3 w-full sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <span
          className="text-sm text-foreground/60"
        >
          {infoText}
        </span>
        <div
          className="flex gap-2 justify-end"
        >
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || hasReachedLimit}
            size="sm"
            variant="secondary"
            icon={<PlusMiniSVG
              className="size-5 -ml-1"
            />}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
          <Button
            onClick={() => handleReviewRef.current?.()}
            disabled={selectedPhotoIdsOrder.length === 0 || isUploading}
          >
            Review
            {' '}
            {selectedPhotoIdsOrder.length > 0 ? `${selectedPhotoIdsOrder.length} ` : ''}
            photo
            {selectedPhotoIdsOrder.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    ),
    [selectedPhotoIdsOrder.length, isUploading, hasReachedLimit, infoText],
  );

  useLayoutEffect(() => {
    if (!showConfirm) modalContext.setFooter(footerContent);
  }, [footerContent, showConfirm, modalContext]);

  const handleBack = () => {
    modalContext.setTitle(`Add photos to: ${albumTitle}`);
    modalContext.setSize('large');
    setShowConfirm(false);
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      const photoIds = selectedPhotos.map((p) => p.id);
      const submittedCount = await addMutation.mutateAsync(photoIds);
      const photoUrls = selectedPhotos.map((p) => p.url);
      onSuccessRef.current(submittedCount, photoUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add photos');
    }
  };

  // Confirm step: footer with Back / Add buttons
  const confirmFooter = useMemo(
    () => (
      <div
        className="flex justify-between items-center w-full"
      >
        <Button
          variant="secondary"
          onClick={handleBack}
          disabled={addMutation.isPending}
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={addMutation.isPending}
          loading={addMutation.isPending}
        >
          Add
          {' '}
          {selectedPhotos.length}
          {' '}
          photo
          {selectedPhotos.length !== 1 ? 's' : ''}
        </Button>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPhotos.length, addMutation.isPending],
  );

  // Set modal title, size and footer when entering confirm step
  useLayoutEffect(() => {
    if (showConfirm) {
      modalContext.setTitle('Confirm your photos');
      modalContext.setSize('default');
      modalContext.setFooter(confirmFooter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showConfirm, confirmFooter]);

  if (showConfirm) {
    return (
      <div
        className="flex flex-col"
      >
        <p
          className="text-foreground/70 mb-4"
        >
          You&apos;re about to add
          {' '}
          {selectedPhotos.length}
          {' '}
          photo
          {selectedPhotos.length !== 1 ? 's' : ''}
          {' '}
          to
          {' '}
          <span
            className="font-semibold text-foreground"
          >
            {albumTitle}
          </span>
          .
        </p>

        {error && (
          <div
            className="mb-4"
          >
            <ErrorMessage
              variant="compact"
            >
              {error}
            </ErrorMessage>
          </div>
        )}

        <div
          className="grid gap-2 md:grid-cols-2 max-h-[50vh] overflow-y-auto"
        >
          {selectedPhotos.map((photo) => (
            <PhotoListItem
              key={photo.id}
              photo={photo}
              variant="compact"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-[60vh] flex-col"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {error && (
        <div
          className="mb-4"
        >
          <ErrorMessage
            variant="compact"
          >
            {error}
          </ErrorMessage>
        </div>
      )}

      <DropZone
        onDrop={handleUpload}
        disabled={isUploading || hasReachedLimit}
        className="flex-1 min-h-0 overflow-hidden rounded-lg border border-border-color bg-background-medium"
        overlayMessage="Drop to upload"
      >
        <div
          className="h-full overflow-y-auto"
        >
          {isLoading ? (
            <div
              className="flex h-full items-center justify-center"
            >
              <p
                className="text-foreground/50"
              >
                Loading photos...
              </p>
            </div>
          ) : hasReachedLimit ? (
            <div
              className="flex h-full flex-col items-center justify-center p-8 text-center"
            >
              <p
                className="text-foreground/70"
              >
                You&apos;ve reached the maximum of
                {' '}
                {maxPhotosPerUser}
                {' '}
                photo
                {maxPhotosPerUser !== 1 ? 's' : ''}
                {' '}
                for this album.
              </p>
            </div>
          ) : photos.length === 0 && uploadingPhotos.length === 0 ? (
            <div
              className="flex h-full flex-col items-center justify-center p-8 text-center"
            >
              <ImageSVG
                className="size-10 mb-2 text-foreground/30"
              />
              <p
                className="text-foreground/70 mb-2"
              >
                You don&apos;t have any photos yet
              </p>
              <p
                className="text-sm text-foreground/50 mb-4"
              >
                Drag and drop photos here, or use the &quot;Upload&quot; button
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                icon={<PlusMiniSVG
                  className="size-5 -ml-0.5"
                />}
              >
                Upload
              </Button>
            </div>
          ) : (
            <PhotoGrid
              photos={photos}
              selectedPhotoIds={selectedPhotoIdsSet}
              onSelectPhoto={handleSelectPhoto}
              onPhotoClick={(photo) => handleSelectPhoto(photo.id)}
              onClearSelection={handleClearSelection}
              onSelectMultiple={handleSelectMultiple}
              sortable={false}
              disabledIds={nonSelectablePhotoIds}
              disabledMessage="This photo is already in the album or is private"
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
        </div>
      </DropZone>
    </div>
  );
}
