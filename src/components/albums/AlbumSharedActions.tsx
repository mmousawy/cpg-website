'use client';

import JoinAlbumButton from '@/components/albums/JoinAlbumButton';
import SubmitToSharedAlbumButton from '@/components/albums/SubmitToSharedAlbumButton';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from '@/hooks/useSession';
import { useMySharedAlbumMembership } from '@/hooks/useSharedAlbumMembers';
import type { AlbumJoinPolicy } from '@/types/albums';

type AlbumSharedActionsProps = {
  albumId: string;
  albumSlug: string;
  albumTitle: string;
  ownerNickname: string | null;
  ownerId?: string;
  joinPolicy: AlbumJoinPolicy | null;
  maxPhotosPerUser?: number | null;
  eventId?: number | null;
  isEventAlbum: boolean;
};

function AlbumSharedActionsGuest(props: AlbumSharedActionsProps) {
  const {
    albumId,
    albumSlug,
    albumTitle,
    ownerNickname,
    ownerId,
    joinPolicy,
    maxPhotosPerUser,
    eventId,
    isEventAlbum,
  } = props;

  return (
    <div
      className="flex flex-wrap gap-2"
    >
      <JoinAlbumButton
        albumId={albumId}
        albumSlug={albumSlug}
        albumTitle={albumTitle}
        ownerNickname={ownerNickname}
        ownerId={ownerId}
        joinPolicy={joinPolicy}
        isEventAlbum={isEventAlbum}
      />
      <SubmitToSharedAlbumButton
        albumId={albumId}
        albumTitle={albumTitle}
        albumSlug={albumSlug}
        ownerNickname={ownerNickname}
        maxPhotosPerUser={maxPhotosPerUser}
        eventId={eventId}
        canAddPhotos={isEventAlbum}
      />
    </div>
  );
}

function AlbumSharedActionsAuthenticated(props: AlbumSharedActionsProps) {
  const {
    albumId,
    albumSlug,
    albumTitle,
    ownerNickname,
    ownerId,
    joinPolicy,
    maxPhotosPerUser,
    eventId,
    isEventAlbum,
  } = props;
  const { user } = useAuth();
  const { data: membership } = useMySharedAlbumMembership(albumId, user?.id);

  const isMember = !!membership;
  const canAddPhotos = isEventAlbum || isMember;

  return (
    <div
      className="flex flex-wrap gap-2"
    >
      <JoinAlbumButton
        albumId={albumId}
        albumSlug={albumSlug}
        albumTitle={albumTitle}
        ownerNickname={ownerNickname}
        ownerId={ownerId}
        joinPolicy={joinPolicy}
        isEventAlbum={isEventAlbum}
      />
      <SubmitToSharedAlbumButton
        albumId={albumId}
        albumTitle={albumTitle}
        albumSlug={albumSlug}
        ownerNickname={ownerNickname}
        maxPhotosPerUser={maxPhotosPerUser}
        eventId={eventId}
        canAddPhotos={canAddPhotos}
      />
    </div>
  );
}

export default function AlbumSharedActions(props: AlbumSharedActionsProps) {
  const { isLoggedIn } = useSession();

  if (!isLoggedIn) {
    return (
      <AlbumSharedActionsGuest
        {...props}
      />
    );
  }

  return (
    <AlbumSharedActionsAuthenticated
      {...props}
    />
  );
}
