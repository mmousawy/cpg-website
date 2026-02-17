'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useMySharedAlbumMembership } from '@/hooks/useSharedAlbumMembers';
import { useMyPhotoCountInAlbum } from '@/hooks/useSharedAlbumSubmissions';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import SubmitToSharedAlbumContent from './SubmitToSharedAlbumContent';

import CheckCircleSVG from 'public/icons/check-circle.svg';
import PlusSVG from 'public/icons/plus.svg';

type SubmitToSharedAlbumButtonProps = {
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  ownerNickname: string | null;
  maxPhotosPerUser?: number | null;
  /** Event albums: any member can add. User shared albums: must be member. */
  canAddPhotos: boolean;
};

export default function SubmitToSharedAlbumButton({
  albumId,
  albumTitle,
  albumSlug,
  ownerNickname,
  maxPhotosPerUser,
  canAddPhotos,
}: SubmitToSharedAlbumButtonProps) {
  const { user } = useAuth();
  const showAuthPrompt = useAuthPrompt();
  const modalContext = useContext(ModalContext);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: membership } = useMySharedAlbumMembership(albumId, user?.id);
  const { data: myCount = 0 } = useMyPhotoCountInAlbum(albumId, user?.id);

  const hasReachedLimit = maxPhotosPerUser ? myCount >= maxPhotosPerUser : false;

  const showSuccessModal = (submittedCount: number, photoUrls: string[]) => {
    const handleClose = () => modalContext.setIsOpen(false);

    modalContext.setSize('small');
    modalContext.setTitle('');
    modalContext.setContent(
      <div
        className="flex flex-col items-center gap-4 py-4"
      >
        <CheckCircleSVG
          className="size-12 text-green-500"
        />
        <p
          className="text-center text-foreground"
        >
          Added
          {' '}
          {submittedCount}
          {' '}
          photo
          {submittedCount !== 1 ? 's' : ''}
          {' '}
          to
          {' '}
          {albumTitle}
        </p>
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
              router.push(ownerNickname ? `/@${ownerNickname}/album/${albumSlug}` : '/gallery');
            }}
            variant="secondary"
          >
            View album
          </Button>
        </div>
      </div>,
    );
    modalContext.setFooter(null);
    modalContext.setIsOpen(true);
  };

  const handleClick = () => {
    if (!user) {
      showAuthPrompt({ feature: 'add photos to this album' });
      return;
    }

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
        onClose={() => modalContext.setIsOpen(false)}
        onSuccess={(submittedCount, photoUrls) => {
          queryClient.invalidateQueries({ queryKey: ['album-photos', albumId] });
          queryClient.invalidateQueries({ queryKey: ['album-photos-count', albumId, user.id] });
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
