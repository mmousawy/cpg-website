'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import PhotoListItem from '@/components/manage/PhotoListItem';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import { useSubmitToChallenge } from '@/hooks/useChallengeSubmissions';
import type { Photo } from '@/types/photos';
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

interface SubmitConfirmContentProps {
  challengeId: string;
  challengeTitle: string;
  selectedPhotos: Photo[];
  onBack: () => void;
  onSuccess: (submittedCount: number, photoUrls: string[]) => void;
}

export default function SubmitConfirmContent({
  challengeId,
  challengeTitle,
  selectedPhotos,
  onBack,
  onSuccess,
}: SubmitConfirmContentProps) {
  const modalContext = useContext(ModalContext);
  const [error, setError] = useState<string | null>(null);

  const submitMutation = useSubmitToChallenge();

  // Use refs to avoid stale closures
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const handleBack = () => {
    modalContext.setTitle(`Submit to: ${challengeTitle}`);
    modalContext.setSize('large');
    onBack();
  };

  const handleSubmit = async () => {
    setError(null);

    try {
      const photoIds = selectedPhotos.map((p) => p.id);
      const submittedCount = await submitMutation.mutateAsync({
        challengeId,
        photoIds,
      });

      const photoUrls = selectedPhotos.map((p) => p.url);
      onSuccessRef.current(submittedCount, photoUrls);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit photos';
      setError(message);
    }
  };

  // Footer content
  const footerContent = useMemo(
    () => (
      <div
        className="flex justify-between items-center w-full"
      >
        <Button
          variant="secondary"
          onClick={handleBack}
          disabled={submitMutation.isPending}
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          loading={submitMutation.isPending}
        >
          Submit
          {' '}
          {selectedPhotos.length}
          {' '}
          photo
          {selectedPhotos.length !== 1 ? 's' : ''}
        </Button>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPhotos.length, submitMutation.isPending],
  );

  // Set modal title, size and footer
  useLayoutEffect(() => {
    modalContext.setTitle('Confirm your photos');
    modalContext.setSize('default');
    modalContext.setFooter(footerContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [footerContent]);

  return (
    <div
      className="flex flex-col"
    >
      <p
        className="text-foreground/70 mb-4"
      >
        You&apos;re about to submit
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
          {challengeTitle}
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

      {/* Photo preview grid */}
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
