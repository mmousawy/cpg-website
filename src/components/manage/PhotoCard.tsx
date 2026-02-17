'use client';

import Avatar from '@/components/auth/Avatar';
import BlurImage from '@/components/shared/BlurImage';
import CardBadges from '@/components/shared/CardBadges';
import type { Photo, PhotoOwnerProfile, PhotoWithAlbums } from '@/types/photos';
import { getSquareThumbnailUrl } from '@/utils/supabaseImageLoader';
import clsx from 'clsx';
import AwardStarMiniSVG from 'public/icons/award-star-mini.svg';
import CancelSVG from 'public/icons/cancel.svg';
import CheckSVG from 'public/icons/check.svg';
import ClockMiniSVG from 'public/icons/clock-mini.svg';
import FolderInAlbumSVG from 'public/icons/folder-in-album.svg';
import PrivateMicroSVG from 'public/icons/private-micro.svg';
import WallArtSVG from 'public/icons/wall-art.svg';
import { memo, useMemo } from 'react';

interface PhotoCardProps {
  photo: (Photo | PhotoWithAlbums) & { isExiting?: boolean };
  isSelected: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  /** Whether drag-to-reorder is enabled */
  sortable?: boolean;
  /** URL of the album cover image (if photo is in album context) */
  albumCoverUrl?: string | null;
  /** Current album title (if viewing in album context) */
  currentAlbumTitle?: string | null;
  /** Whether this photo is disabled (non-selectable) */
  disabled?: boolean;
  /** Message to show when disabled */
  disabledMessage?: string;
  /** Whether this photo was rejected (for challenge submissions) */
  rejected?: boolean;
  /** Whether this photo is pending review (for challenge submissions) */
  pending?: boolean;
  /** Whether this photo was accepted (for challenge submissions) */
  accepted?: boolean;
  /** Profile of the photo owner if not owned by the current user (shows avatar badge) */
  notOwnedProfile?: PhotoOwnerProfile | null;
}

function PhotoCard({
  photo,
  isSelected,
  isHovered = false,
  isDragging = false,
  sortable = false,
  albumCoverUrl,
  currentAlbumTitle,
  disabled = false,
  disabledMessage,
  rejected = false,
  pending = false,
  accepted = false,
  notOwnedProfile,
}: PhotoCardProps) {
  // Generate square cropped thumbnail URL (256x256px, center-cropped)
  const thumbnailUrl = getSquareThumbnailUrl(photo.url, 256, 85) || photo.url;
  const isAlbumCover = albumCoverUrl === photo.url;

  const photoWithAlbums = photo as PhotoWithAlbums;
  const isInAlbum = photoWithAlbums.albums && photoWithAlbums.albums.length > 0;

  // Find which albums this photo is the cover of
  const coverAlbums = photoWithAlbums.albums?.filter((a) => a.cover_image_url === photo.url) || [];
  const coverAlbumNames = coverAlbums.map((a) => a.title).join(', ');

  // Check for accepted challenges
  const acceptedChallenges = photoWithAlbums.challenges?.filter((c) => c.status === 'accepted') || [];
  const isInAcceptedChallenge = acceptedChallenges.length > 0;
  const acceptedChallengeNames = acceptedChallenges.map((c) => c.title).join(', ');

  const badges = useMemo(() => {
    const badgeList = [];
    // Show star badge for photos accepted in challenges (only when not in challenge context)
    if (isInAcceptedChallenge && !accepted && !pending && !rejected) {
      badgeList.push({
        icon: <AwardStarMiniSVG
          className="size-4 fill-current"
        />,
        variant: 'challenge' as const,
        tooltip: acceptedChallengeNames ? `Accepted in: ${acceptedChallengeNames}` : 'Accepted in challenge',
      });
    }
    if (accepted) {
      badgeList.push({
        icon: <CheckSVG
          className="size-4 fill-current"
        />,
        variant: 'accepted' as const,
        tooltip: 'Already accepted in this challenge',
      });
    }
    if (pending) {
      badgeList.push({
        icon: <ClockMiniSVG
          className="size-4 fill-current"
        />,
        variant: 'pending' as const,
        tooltip: 'Pending review',
      });
    }
    if (rejected) {
      badgeList.push({
        icon: <CancelSVG
          className="size-4 fill-current"
        />,
        variant: 'rejected' as const,
        tooltip: 'Previously rejected - cannot be resubmitted',
      });
    }
    if (isAlbumCover) {
      const tooltipText = currentAlbumTitle
        ? `Used as cover of "${currentAlbumTitle}"`
        : coverAlbumNames
          ? `Used as cover of: ${coverAlbumNames}`
          : 'Used as album cover';
      badgeList.push({
        icon: <WallArtSVG
          className="size-4 fill-current"
        />,
        variant: 'album-cover' as const,
        tooltip: tooltipText,
      });
    }
    if (isInAlbum && !isAlbumCover) {
      const albumNames = photoWithAlbums.albums?.map((a) => a.title).join(', ') || '';
      badgeList.push({
        icon: <FolderInAlbumSVG
          className="size-4 fill-current"
        />,
        variant: 'in-album' as const,
        tooltip: albumNames ? `In albums: ${albumNames}` : 'In album',
      });
    }
    if (notOwnedProfile) {
      const ownerLabel = notOwnedProfile.nickname
        ? `@${notOwnedProfile.nickname}`
        : notOwnedProfile.full_name || 'Another user';
      badgeList.push({
        icon: <Avatar
          avatarUrl={notOwnedProfile.avatar_url}
          fullName={notOwnedProfile.full_name}
          size="xxs"
          className="w-4! h-4!"
        />,
        variant: 'in-album' as const,
        tooltip: ownerLabel,
      });
    }
    if (!photo.is_public && !notOwnedProfile) {
      badgeList.push({
        icon: <PrivateMicroSVG
          className="size-4"
        />,
        variant: 'private' as const,
        tooltip: disabledMessage || 'Private (only visible to you)',
      });
    }
    return badgeList;
  }, [accepted, pending, rejected, isAlbumCover, isInAlbum, isInAcceptedChallenge, acceptedChallengeNames, photo.is_public, photoWithAlbums.albums, currentAlbumTitle, coverAlbumNames, disabledMessage, notOwnedProfile]);

  return (
    <div
      data-testid="photo-card"
      className={clsx(
        'overflow-hidden transition-all duration-300',
        disabled
          ? 'cursor-not-allowed'
          : 'cursor-pointer',
        sortable && !disabled && 'active:cursor-grabbing',
        disabled
          ? '' // No ring effects when disabled
          : isSelected
            ? 'ring-2 ring-primary ring-offset-1 light:ring-offset-white dark:ring-offset-white/50'
            : isHovered
              ? 'ring-2 ring-primary/50 ring-offset-0 [&>div>div]:opacity-80'
              : 'hover:ring-2 hover:ring-primary/50',
        isDragging && 'opacity-50',
        photo.isExiting && 'opacity-0 scale-95',
      )}
    >
      {/* Image */}
      <div
        className="relative aspect-square overflow-hidden bg-background-light"
      >
        <BlurImage
          src={thumbnailUrl}
          alt={photo.title || 'Photo'}
          blurhash={photo.blurhash}
          fill
          sizes="200px"
          quality={85}
          className={clsx(
            'object-cover transition-transform',
            disabled && 'grayscale opacity-60',
          )}
          draggable={false}
        />
        {/* Badges */}
        <CardBadges
          badges={badges}
        />

        {/* Hover overlay */}
        <div
          className="absolute inset-0 bg-primary/50 opacity-0 transition-opacity pointer-events-none"
        ></div>
      </div>

      {/* Title overlay on hover */}
      {photo.title && (
        <div
          className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/35 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <p
            className="truncate text-sm text-white"
          >
            {photo.title}
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(PhotoCard, (prevProps, nextProps) => {
  // Only re-render if photo data, selection, hover, dragging, sortable, exit state, album cover, albums, challenges, current album title, disabled, or rejected state change
  const prevPhoto = prevProps.photo as PhotoWithAlbums;
  const nextPhoto = nextProps.photo as PhotoWithAlbums;
  const prevAlbumsLength = prevPhoto.albums?.length || 0;
  const nextAlbumsLength = nextPhoto.albums?.length || 0;
  const prevChallengesLength = prevPhoto.challenges?.length || 0;
  const nextChallengesLength = nextPhoto.challenges?.length || 0;

  return (
    prevProps.photo.id === nextProps.photo.id &&
    prevProps.photo.url === nextProps.photo.url &&
    prevProps.photo.title === nextProps.photo.title &&
    prevProps.photo.is_public === nextProps.photo.is_public &&
    prevAlbumsLength === nextAlbumsLength &&
    prevChallengesLength === nextChallengesLength &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.sortable === nextProps.sortable &&
    prevProps.photo.isExiting === nextProps.photo.isExiting &&
    prevProps.albumCoverUrl === nextProps.albumCoverUrl &&
    prevProps.currentAlbumTitle === nextProps.currentAlbumTitle &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.disabledMessage === nextProps.disabledMessage &&
    prevProps.rejected === nextProps.rejected &&
    prevProps.notOwnedProfile === nextProps.notOwnedProfile
  );
});
