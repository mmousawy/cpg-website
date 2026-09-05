'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useSession } from '@/hooks/useSession';
import { useMyPhotoCountInAlbum } from '@/hooks/useSharedAlbumSubmissions';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import SubmissionSuccessContent from '@/components/challenges/SubmissionSuccessContent';
import SubmitToSharedAlbumContent from './SubmitToSharedAlbumContent';

import CheckCircleSVG from 'public/icons/check-circle.svg';
import PlusSVG from 'public/icons/plus.svg';

type SubmitToSharedAlbumButtonProps = {
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  ownerNickname: string | null;
  maxPhotosPerUser?: number | null;
  eventId?: number | null;
  /** Event albums: any member can add. User shared albums: must be member. */
  canAddPhotos: boolean;
};

function SubmitToSharedAlbumButtonGuest({
  canAddPhotos,
}: SubmitToSharedAlbumButtonProps) {
  const showAuthPrompt = useAuthPrompt();

  if (!canAddPhotos) return null;

  return (
    <Button
      onClick={() => showAuthPrompt({ feature: 'add photos to this album' })}
      variant="primary"
      size="md"
    >
      <PlusSVG
        className="h-5 w-5"
      />
      Add photos
    </Button>
  );
}

function SubmitToSharedAlbumButtonAuthenticated(props: SubmitToSharedAlbumButtonProps) {
  const {
    albumId,
    albumTitle,
    albumSlug,
    ownerNickname,
    maxPhotosPerUser,
    eventId,
    canAddPhotos,
  } = props;
  const modalContext = useContext(ModalContext);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();

  const { data: myCount = 0 } = useMyPhotoCountInAlbum(albumId, user?.id);

  const hasReachedLimit = maxPhotosPerUser ? myCount >= maxPhotosPerUser : false;

  const showSuccessModal = (submittedCount: number, photoUrls: string[]) => {
    const handleClose = () => modalContext.setIsOpen(false);

    modalContext.setSize('default');
    modalContext.setFlushContentTop(false);
    modalContext.setTitle('');
    modalContext.setContent(
      <SubmissionSuccessContent
        variant="album"
        destinationTitle={albumTitle}
        submittedCount={submittedCount}
        photoUrls={photoUrls}
      />,
    );
    modalContext.setFooter(
      <div
        className="flex flex-wrap justify-center gap-3 w-full"
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
            router.push(ownerNickname ? `/@${ownerNickname}/album/${albumSlug}` : '/gallery');
          }}
          variant="secondary"
        >
          View album
        </Button>
      </div>,
    );
  };

  const handleClick = () => {
    modalContext.setSize('large');
    modalContext.setTitle(`Add photos to: ${albumTitle}`);
    modalContext.setContent(
      <SubmitToSharedAlbumContent
        key={Date.now()}
        albumId={albumId}
        albumTitle={albumTitle}
        albumSlug={albumSlug}
        ownerNickname={ownerNickname}
        maxPhotosPerUser={maxPhotosPerUser}
        eventId={eventId}
        onClose={() => modalContext.setIsOpen(false)}
        onSuccess={(submittedCount, photoUrls) => {
          queryClient.invalidateQueries({ queryKey: ['album-photos', albumId] });
          queryClient.invalidateQueries({ queryKey: ['album-photos-count', albumId, user?.id] });
          queryClient.invalidateQueries({ queryKey: ['shared-album-membership', albumId] });
          showSuccessModal(submittedCount, photoUrls);
        }}
      />,
    );
    modalContext.setIsOpen(true);
  };

  if (!canAddPhotos) return null;

  if (hasReachedLimit) {
    return (
      <Button
        variant="secondary"
        disabled
      >
        <CheckCircleSVG
          className="h-5 w-5"
        />
        Added (
        {myCount}
        /
        {maxPhotosPerUser}
        )
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      variant="primary"
      size="md"
    >
      <PlusSVG
        className="h-5 w-5"
      />
      Add photos
    </Button>
  );
}

export default function SubmitToSharedAlbumButton(props: SubmitToSharedAlbumButtonProps) {
  const { isLoggedIn } = useSession();

  if (!isLoggedIn) {
    return (
      <SubmitToSharedAlbumButtonGuest
        {...props}
      />
    );
  }

  return (
    <SubmitToSharedAlbumButtonAuthenticated
      {...props}
    />
  );
}
