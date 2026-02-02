'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import { PhotoGrid, UploadingPhotoCard } from '@/components/manage';
import Button from '@/components/shared/Button';
import DropZone from '@/components/shared/DropZone';
import ErrorMessage from '@/components/shared/ErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { useMySubmissionsForChallenge, useSubmitToChallenge } from '@/hooks/useChallengeSubmissions';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { useSupabase } from '@/hooks/useSupabase';
import type { Photo } from '@/types/photos';
import { preloadImages } from '@/utils/preloadImages';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import ImageSVG from 'public/icons/image.svg';
import PlusMiniSVG from 'public/icons/plus-mini.svg';

interface SubmitToChallengeContentProps {
  challengeId: string;
  maxPhotosPerUser?: number | null;
  onClose: () => void;
  onSuccess: (submittedCount: number, photoUrls: string[]) => void;
}

export default function SubmitToChallengeContent({
  challengeId,
  maxPhotosPerUser,
  onClose,
  onSuccess,
}: SubmitToChallengeContentProps) {
  const { user } = useAuth();
  const supabase = useSupabase();
  const modalContext = useContext(ModalContext);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use refs to avoid infinite loops with callbacks
  const onCloseRef = useRef(onClose);
  const onSuccessRef = useRef(onSuccess);
  const handleSubmitRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // Upload hook with progress tracking
  const { uploadingPhotos, uploadFiles, clearCompleted, dismissUpload } = usePhotoUpload();
  const isUploading = uploadingPhotos.some(
    (p) => p.status === 'uploading' || p.status === 'processing' || p.status === 'pending',
  );

  // Get user's existing submissions
  const { data: existingSubmissions } = useMySubmissionsForChallenge(user?.id, challengeId);

  // Photo IDs that are pending or accepted - completely hidden from grid
  const submittedPhotoIds = useMemo(
    () => new Set(
      (existingSubmissions || [])
        .filter((s) => s.status === 'pending' || s.status === 'accepted')
        .map((s) => s.photo_id),
    ),
    [existingSubmissions],
  );

  // Photo IDs that were rejected - shown in grid but disabled with badge
  const rejectedPhotoIds = useMemo(
    () => new Set(
      (existingSubmissions || [])
        .filter((s) => s.status === 'rejected')
        .map((s) => s.photo_id),
    ),
    [existingSubmissions],
  );

  // Calculate remaining quota
  const currentSubmissionCount = existingSubmissions?.length || 0;
  const remainingQuota = maxPhotosPerUser
    ? Math.max(0, maxPhotosPerUser - currentSubmissionCount)
    : null;
  const hasReachedLimit = remainingQuota !== null && remainingQuota <= 0;

  // Mutation for submitting
  const submitMutation = useSubmitToChallenge();

  // Fetch user's photos
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
        console.error('Error fetching photos:', fetchError);
        setError('Failed to load photos');
      } else {
        setPhotos((data || []) as Photo[]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Failed to load photos');
    }
    setIsLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Filter out photos that are pending or accepted (rejected photos stay visible but disabled)
  const availablePhotos = useMemo(
    () => photos.filter((p) => !submittedPhotoIds.has(p.id)),
    [photos, submittedPhotoIds],
  );

  // Get private and rejected photo IDs (these are disabled/non-selectable)
  const privateAndRejectedPhotoIds = useMemo(
    () => new Set(availablePhotos.filter((p) => !p.is_public || rejectedPhotoIds.has(p.id)).map((p) => p.id)),
    [availablePhotos, rejectedPhotoIds],
  );

  // Selection handlers
  const handleSelectPhoto = (photoId: string) => {
    // Skip private or rejected photos
    if (privateAndRejectedPhotoIds.has(photoId)) return;

    setSelectedPhotoIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        // If at quota limit, replace selection instead of blocking
        if (remainingQuota !== null && newSet.size >= remainingQuota) {
          // Clear existing selection and add the new photo
          newSet.clear();
          newSet.add(photoId);
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
      for (const id of ids) {
        // Skip private or rejected photos
        if (privateAndRejectedPhotoIds.has(id)) continue;
        // Stop adding if we've reached the quota
        if (remainingQuota !== null && newSet.size >= remainingQuota) {
          break;
        }
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Upload handler - photos are public by default for challenges
  const handleUpload = async (files: File[]) => {
    if (!files || files.length === 0 || !user) return;

    try {
      const uploadedPhotos = await uploadFiles(files, user.id, supabase, {
        isPublic: true, // Public by default for challenge submissions
        sortOrderStart: photos.length,
      });

      // Preload images before refreshing the list
      if (uploadedPhotos.length > 0) {
        const photoUrls = uploadedPhotos.map((p) => p.url);
        await preloadImages(photoUrls);
      }

      // Refresh the photos list
      await fetchPhotos();

      // Clear completed uploads
      clearCompleted();

      // Auto-select newly uploaded photos (if within quota)
      if (uploadedPhotos.length > 0) {
        setSelectedPhotoIds((prev) => {
          const newSet = new Set(prev);
          for (const photo of uploadedPhotos) {
            if (remainingQuota !== null && newSet.size >= remainingQuota) {
              break;
            }
            newSet.add(photo.id);
          }
          return newSet;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload photos';
      console.error('Upload error:', err);
      setError(message);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(Array.from(files));
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (selectedPhotoIds.size === 0) return;

    setError(null);
    const submittedCount = selectedPhotoIds.size;
    const submittedPhotoUrls = photos
      .filter((p) => selectedPhotoIds.has(p.id))
      .map((p) => p.url);

    try {
      await submitMutation.mutateAsync({
        challengeId,
        photoIds: Array.from(selectedPhotoIds),
      });
      onSuccessRef.current(submittedCount, submittedPhotoUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit photos');
    }
  }, [selectedPhotoIds, challengeId, submitMutation, photos]);

  // Keep ref updated
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Info text for footer
  const infoText = useMemo(() => {
    if (hasReachedLimit) {
      return `Maximum ${maxPhotosPerUser} reached`;
    }
    if (selectedPhotoIds.size > 0) {
      if (remainingQuota !== null) {
        const remaining = remainingQuota - selectedPhotoIds.size;
        return `${remaining} more photo${remaining !== 1 ? 's' : ''} allowed`;
      }
      return `${selectedPhotoIds.size} photo${selectedPhotoIds.size !== 1 ? 's' : ''} selected`;
    }
    if (remainingQuota !== null) {
      return `Max ${remainingQuota} photo${remainingQuota !== 1 ? 's' : ''}`;
    }
    return 'Uploaded photos from this modal will be public';
  }, [selectedPhotoIds.size, remainingQuota, hasReachedLimit, maxPhotosPerUser]);

  // Footer content - memoized to prevent infinite loops
  const footerContent = useMemo(
    () => (
      <div
        className="flex flex-col gap-3 w-full sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        {/* Info text and upload button - own row on mobile, left side on desktop */}
        <div
          className="flex items-center justify-between gap-3 sm:justify-start"
        >
          <span
            className="text-sm text-foreground/60"
          >
            {infoText}
          </span>
        </div>
        {/* Action buttons - own row on mobile, right side on desktop */}
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
            onClick={() => handleSubmitRef.current?.()}
            disabled={submitMutation.isPending || selectedPhotoIds.size === 0 || isUploading}
            loading={submitMutation.isPending}
          >
            Submit
            {' '}
            {selectedPhotoIds.size > 0 ? `${selectedPhotoIds.size} ` : ''}
            photo
            {selectedPhotoIds.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    ),
    [selectedPhotoIds.size, submitMutation.isPending, isUploading, hasReachedLimit, infoText],
  );

  // Set modal footer with action buttons
  useEffect(() => {
    modalContext.setFooter(footerContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- modalContext.setFooter is stable, including modalContext causes infinite loop
  }, [footerContent]);

  return (
    <div
      className="flex h-[60vh] flex-col"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Error message */}
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

      {/* Content area with drop zone */}
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
                for this challenge.
              </p>
            </div>
          ) : availablePhotos.length === 0 && uploadingPhotos.length === 0 ? (
            <div
              className="flex h-full flex-col items-center justify-center p-8 text-center"
            >
              <ImageSVG
                className="size-10 mb-2 text-foreground/30"
              />
              <p
                className="text-foreground/70 mb-2"
              >
                {photos.length === 0
                  ? "You don't have any photos yet"
                  : 'All your photos have already been submitted'}
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
              photos={availablePhotos}
              selectedPhotoIds={selectedPhotoIds}
              onSelectPhoto={handleSelectPhoto}
              onPhotoClick={(photo) => handleSelectPhoto(photo.id)}
              onClearSelection={handleClearSelection}
              onSelectMultiple={handleSelectMultiple}
              sortable={false}
              disabledIds={privateAndRejectedPhotoIds}
              disabledMessage="This photo cannot be submitted because it is private"
              rejectedIds={rejectedPhotoIds}
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
