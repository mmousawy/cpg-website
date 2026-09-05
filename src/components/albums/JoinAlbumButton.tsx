'use client';

import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useSession } from '@/hooks/useSession';
import {
  useAcceptAlbumInvite,
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

function JoinAlbumButtonGuest({
  joinPolicy,
  isEventAlbum = false,
}: JoinAlbumButtonProps) {
  const showAuthPrompt = useAuthPrompt();

  if (isEventAlbum || !joinPolicy) {
    return null;
  }

  const label = joinPolicy === 'open' ? 'Join album' : 'Request to join';

  return (
    <Button
      variant="primary"
      onClick={() => showAuthPrompt({ feature: 'join this album' })}
    >
      {label}
    </Button>
  );
}

function JoinAlbumButtonAuthenticated(props: JoinAlbumButtonProps) {
  const {
    albumId,
    albumSlug,
    albumTitle,
    ownerNickname,
    ownerId,
    joinPolicy,
    isEventAlbum = false,
  } = props;
  const { user } = useAuth();
  const modalContext = useContext(ModalContext);

  const { data: membership, isLoading: membershipLoading } = useMySharedAlbumMembership(
    albumId,
    user?.id,
  );
  const { data: requests } = useSharedAlbumRequests(albumId);
  const joinMutation = useJoinSharedAlbum(albumId, ownerNickname, albumSlug, {
    albumTitle,
    ownerId,
    userId: user?.id,
  });
  const acceptInviteMutation = useAcceptAlbumInvite(albumId, ownerNickname, albumSlug, user?.id, {
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
  const pendingInvite = requests?.find(
    (r) => r.user_id === user?.id && r.type === 'invite' && r.status === 'pending',
  );
  const hasPendingInvite = !!pendingInvite;

  const handleJoinClick = () => {
    joinMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result?.status === 'already_requested' || result?.status === 'requested') {
          // Could show a toast - for now we rely on query invalidation
        }
      },
      onError: showJoinError,
    });
  };

  const handleAcceptInviteClick = () => {
    if (!pendingInvite) return;
    acceptInviteMutation.mutate(pendingInvite.id, {
      onError: showJoinError,
    });
  };

  function showJoinError(err: Error) {
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
  }

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
        onClick={handleAcceptInviteClick}
        loading={acceptInviteMutation.isPending}
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
      onClick={handleJoinClick}
      loading={joinMutation.isPending}
    >
      {label}
    </Button>
  );
}

export default function JoinAlbumButton(props: JoinAlbumButtonProps) {
  const { isLoggedIn } = useSession();

  if (!isLoggedIn) {
    return (
      <JoinAlbumButtonGuest
        {...props}
      />
    );
  }

  return (
    <JoinAlbumButtonAuthenticated
      {...props}
    />
  );
}
