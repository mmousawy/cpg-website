'use client';

import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import {
  useJoinSharedAlbum,
  useMySharedAlbumMembership,
  useSharedAlbumRequests,
} from '@/hooks/useSharedAlbumMembers';
import type { AlbumJoinPolicy } from '@/types/albums';
import { useContext } from 'react';
import { ModalContext } from '@/app/providers/ModalProvider';

type JoinAlbumButtonProps = {
  albumId: string;
  albumSlug: string;
  albumTitle?: string;
  ownerNickname: string | null;
  ownerId?: string;
  joinPolicy: AlbumJoinPolicy | null;
  /** Event albums do not support join - hide button */
  isEventAlbum?: boolean;
};

export default function JoinAlbumButton({
  albumId,
  albumSlug,
  albumTitle,
  ownerNickname,
  ownerId,
  joinPolicy,
  isEventAlbum = false,
}: JoinAlbumButtonProps) {
  const { user } = useAuth();
  const showAuthPrompt = useAuthPrompt();
  const modalContext = useContext(ModalContext);

  const { data: membership, isLoading: membershipLoading } = useMySharedAlbumMembership(
    albumId,
    user?.id,
  );
  const { data: requests } = useSharedAlbumRequests(albumId);
  const joinMutation = useJoinSharedAlbum(albumId, ownerNickname, albumSlug, {
    albumTitle,
    ownerId,
  });

  if (isEventAlbum || !joinPolicy) {
    return null;
  }

  const isMember = !!membership;
  const hasPendingRequest = requests?.some(
    (r) => r.user_id === user?.id && r.type === 'request',
  );
  const hasPendingInvite = requests?.some(
    (r) => r.user_id === user?.id && r.type === 'invite',
  );

  const handleClick = () => {
    if (!user) {
      showAuthPrompt({ feature: 'join this album' });
      return;
    }
    joinMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result?.status === 'already_requested' || result?.status === 'requested') {
          // Could show a toast - for now we rely on query invalidation
        }
      },
      onError: (err) => {
        modalContext.setSize('small');
        modalContext.setTitle('Error');
        modalContext.setContent(
          <p
            className="text-sm text-foreground"
          >
            {err.message}
          </p>,
        );
        modalContext.setFooter(null);
        modalContext.setIsOpen(true);
      },
    });
  };

  if (membershipLoading) {
    return (
      <Button
        variant="secondary"
        disabled
      >
        Loading...
      </Button>
    );
  }

  if (isMember) {
    return null;
  }

  if (hasPendingInvite) {
    return (
      <Button
        variant="primary"
        onClick={handleClick}
        loading={joinMutation.isPending}
      >
        Accept invite
      </Button>
    );
  }

  if (hasPendingRequest) {
    return (
      <Button
        variant="secondary"
        disabled
      >
        Request pending
      </Button>
    );
  }

  const label = joinPolicy === 'open' ? 'Join album' : 'Request to join';
  return (
    <Button
      variant="primary"
      onClick={handleClick}
      loading={joinMutation.isPending}
    >
      {label}
    </Button>
  );
}
