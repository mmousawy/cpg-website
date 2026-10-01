'use client';

import type { StreamPhoto } from '@/lib/data/gallery';
import type { Photo } from '@/types/photos';
import type { PhotoCaptionsMode, PhotoGridDensity } from '@/utils/displayPreferences';
import { getCroppedThumbnailUrl, THUMBNAIL_IMAGE_QUALITY } from '@/utils/supabaseImageLoader';
import clsx from 'clsx';

import Avatar from '../auth/Avatar';
import BlurImage from '../shared/BlurImage';
import CardLikes from '../shared/CardLikes';
import HoverPrefetchLink from '../shared/HoverPrefetchLink';

type PhotoGridTileProps = {
  photo: Photo | StreamPhoto;
  likesCount: number;
  photoHref: string;
  nickname: string;
  showAttribution: boolean;
  captionMode: PhotoCaptionsMode;
  canHover: boolean;
  imageSrc: string;
  sizes: string;
  quality: number;
  className?: string;
  style?: React.CSSProperties;
  squareCrop?: boolean;
  gridDensity?: PhotoGridDensity;
};

export default function PhotoGridTile({
  photo,
  likesCount,
  photoHref,
  nickname,
  showAttribution,
  captionMode,
  canHover,
  imageSrc,
  sizes,
  quality,
  className,
  style,
  squareCrop = false,
  gridDensity = 'comfortable',
}: PhotoGridTileProps) {
  const streamPhoto = photo as StreamPhoto;
  const attributionAvatarOnly = gridDensity === 'compact';
  const showOverlays = captionMode === 'always' || (captionMode === 'hover' && canHover);
  const overlayVisible = captionMode === 'always';
  const overlayOpacityClass = overlayVisible
    ? 'opacity-100'
    : 'opacity-0 transition-opacity duration-200 group-hover:opacity-100';

  const photoTitle = photo?.title;
  const ariaLabel = photoTitle
    ? `View photo: ${photoTitle} by @${nickname}`
    : `View photo by @${nickname}`;

  const thumbnailUrl = squareCrop
    ? getCroppedThumbnailUrl(imageSrc, 512, 512, 85) || imageSrc
    : imageSrc;

  return (
    <HoverPrefetchLink
      href={photoHref}
      className={clsx('group relative block overflow-hidden bg-background-light', className)}
      aria-label={ariaLabel}
      style={style}
    >
      <BlurImage
        src={thumbnailUrl}
        alt=""
        blurhash={photo?.blurhash}
        fill
        className="object-cover transition-all duration-200 group-hover:brightness-110"
        sizes={sizes}
        loading="lazy"
        fetchPriority="low"
        quality={quality}
      />

      {photo?.id && (
        <CardLikes
          likesCount={likesCount}
          className="absolute bottom-2! right-2! z-10"
        />
      )}

      {showOverlays && photo?.title && (
        <>
          <div
            className={clsx(
              'absolute inset-x-0 top-0 h-20 bg-linear-to-b from-black/70 to-transparent',
              overlayOpacityClass,
            )}
          />
          <div
            className={clsx('absolute top-0 left-0 right-0 p-3', overlayOpacityClass)}
          >
            <h3
              className="text-sm font-semibold text-white line-clamp-2 drop-shadow-md"
            >
              {photo.title}
            </h3>
          </div>
        </>
      )}

      {showOverlays && showAttribution && streamPhoto?.profile && (
        <>
          <div
            className={clsx(
              'absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent',
              attributionAvatarOnly ? 'h-12' : 'h-20',
              overlayOpacityClass,
            )}
          />
          <div
            className={clsx(
              'absolute left-0 right-0 pr-12 bottom-0 flex items-center p-2',
              !attributionAvatarOnly && 'gap-1',
              overlayOpacityClass,
            )}
          >
            <Avatar
              avatarUrl={streamPhoto.profile.avatar_url}
              fullName={streamPhoto.profile.full_name}
              size="xxs"
            />
            {!attributionAvatarOnly && (
              <span
                className="text-xs font-medium text-white"
              >
                @
                {streamPhoto.profile.nickname}
              </span>
            )}
          </div>
        </>
      )}
    </HoverPrefetchLink>
  );
}

export function getPhotoGridItemKey(photo: Photo | StreamPhoto, index: number): string {
  const id = photo.short_id || photo.id;
  return id != null && id !== '' ? String(id) : `photo-${index}`;
}

export function buildPhotoHref(options: {
  photoId: string;
  profileNickname?: string;
  albumSlug?: string;
  challengeSlug?: string;
  eventSlug?: string;
  streamNickname?: string | null;
}): { href: string; nickname: string } {
  const {
    photoId,
    profileNickname,
    albumSlug,
    challengeSlug,
    eventSlug,
    streamNickname,
  } = options;

  const nickname = albumSlug && profileNickname
    ? profileNickname
    : streamNickname || profileNickname || '';

  const href = challengeSlug
    ? `/challenges/${challengeSlug}/photo/${photoId}`
    : eventSlug
      ? `/events/${eventSlug}/photo/${photoId}`
      : albumSlug
        ? `/@${nickname}/album/${albumSlug}/photo/${photoId}`
        : `/@${nickname}/photo/${photoId}`;

  return { href, nickname };
}

export const SQUARE_TILE_QUALITY = THUMBNAIL_IMAGE_QUALITY;
