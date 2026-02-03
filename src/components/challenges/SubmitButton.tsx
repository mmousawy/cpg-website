'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useMySubmissionsForChallenge } from '@/hooks/useChallengeSubmissions';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import SubmitToChallengeContent from './SubmitToChallengeContent';
import SubmissionSuccessContent from './SubmissionSuccessContent';

import CheckCircleSVG from 'public/icons/check-circle.svg';
import PlusSVG from 'public/icons/plus.svg';

type SubmitButtonProps = {
  challengeId: string;
  challengeTitle: string;
  maxPhotosPerUser?: number | null;
};

export default function SubmitButton({ challengeId, challengeTitle, maxPhotosPerUser }: SubmitButtonProps) {
  const { user } = useAuth();
  const showAuthPrompt = useAuthPrompt();
  const modalContext = useContext(ModalContext);
  const queryClient = useQueryClient();
  const router = useRouter();

  // Check user's existing submissions
  const { data: existingSubmissions } = useMySubmissionsForChallenge(user?.id, challengeId);
  const currentSubmissionCount = existingSubmissions?.length || 0;
  const hasReachedLimit = maxPhotosPerUser
    ? currentSubmissionCount >= maxPhotosPerUser
    : false;

  const showSuccessModal = (submittedCount: number, photoUrls: string[]) => {
    const handleClose = () => modalContext.setIsOpen(false);

    modalContext.setSize('small');
    modalContext.setTitle('');
    modalContext.setContent(
      <SubmissionSuccessContent
        challengeTitle={challengeTitle}
        submittedCount={submittedCount}
        photoUrls={photoUrls}
      />,
    );
    modalContext.setFooter(
      <div
        className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full"
      >
        <Button
          onClick={handleClose}
          variant="primary"
          className="min-w-[120px]"
        >
          Got it!
        </Button>
        <Button
          onClick={() => {
            handleClose();
            router.push('/account/challenges');
          }}
          variant="secondary"
        >
          View my submissions
        </Button>
      </div>,
    );
  };

  const handleSubmit = () => {
    if (!user) {
      showAuthPrompt({ feature: 'submit photos to this challenge' });
      return;
    }

    modalContext.setSize('large');
    modalContext.setTitle(`Submit to: ${challengeTitle}`);
    modalContext.setContent(
      <SubmitToChallengeContent
        key={Date.now()}
        challengeId={challengeId}
        maxPhotosPerUser={maxPhotosPerUser}
        onClose={() => modalContext.setIsOpen(false)}
        onSuccess={(submittedCount, photoUrls) => {
          queryClient.invalidateQueries({ queryKey: ['challenge-photos', challengeId] });
          queryClient.invalidateQueries({ queryKey: ['my-challenge-submissions'] });
          queryClient.invalidateQueries({ queryKey: ['challenge', challengeId] });
          showSuccessModal(submittedCount, photoUrls);
        }}
      />,
    );
    modalContext.setIsOpen(true);
  };

  // User has reached their limit
  if (hasReachedLimit) {
    return (
      <Button
        variant="secondary"
        disabled
      >
        <CheckCircleSVG
          className="h-5 w-5"
        />
        Submitted (
        {currentSubmissionCount}
        /
        {maxPhotosPerUser}
        )
      </Button>
    );
  }

  return (
    <Button
      onClick={handleSubmit}
      variant="primary"
    >
      <PlusSVG
        className="h-5 w-5"
      />
      Submit photos
    </Button>
  );
}
