'use client';

import JoinAlbumButton from '@/components/albums/JoinAlbumButton';
import SubmitToSharedAlbumButton from '@/components/albums/SubmitToSharedAlbumButton';
import { useAuth } from '@/hooks/useAuth';
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
  isEventAlbum: boolean;
};

export default function AlbumSharedActions({
  albumId,
  albumSlug,
  albumTitle,
  ownerNickname,
  ownerId,
  joinPolicy,
  maxPhotosPerUser,
  isEventAlbum,
}: AlbumSharedActionsProps) {
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
        canAddPhotos={canAddPhotos}
      />
    </div>
  );
}
