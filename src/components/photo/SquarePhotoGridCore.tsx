'use client';

import type { StreamPhoto } from '@/lib/data/gallery';
import type { Photo } from '@/types/photos';
import type { PhotoCaptionsMode, PhotoGridDensity } from '@/utils/displayPreferences';
import { getSquareGridClassName } from '@/utils/displayPreferences';
import { useHasHover } from '@/hooks/useHasHover';
import ImageSVG from 'public/icons/image.svg';

import EmptyState from '../shared/EmptyState';
import PhotoGridTile, {
  buildPhotoHref,
  getPhotoGridItemKey,
  SQUARE_TILE_QUALITY,
} from './PhotoGridTile';
import type { JustifiedPhotoGridCoreProps } from './justifiedPhotoGridTypes';

type SquarePhotoGridCoreProps = JustifiedPhotoGridCoreProps & {
  gridDensity: PhotoGridDensity;
  captionMode: PhotoCaptionsMode;
};

export default function SquarePhotoGridCore({
  photos,
  profileNickname,
  albumSlug,
  challengeSlug,
  eventSlug,
  showAttribution = false,
  header,
  batchLikesMap,
  gridDensity,
  captionMode,
}: SquarePhotoGridCoreProps) {
  const hasHover = useHasHover();

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={<ImageSVG
          className="size-10 inline-block"
        />}
        title="No photos yet."
      />
    );
  }

  const gridClassName = getSquareGridClassName(gridDensity);
  const tileSizes = gridDensity === 'compact'
    ? '(max-width: 640px) 140px, 200px'
    : '(max-width: 640px) 200px, 280px';

  return (
    <div
      className="w-full"
    >
      <div
        className={gridClassName}
      >
        {header ? (
          <div
            key="photo-grid-header"
            className="col-span-full"
          >
            {header}
          </div>
        ) : null}
        {photos.map((photo, index) => {
          const photoId = photo.short_id || photo.id;
          const streamPhoto = photo as StreamPhoto;
          const { href, nickname } = buildPhotoHref({
            photoId,
            profileNickname,
            albumSlug,
            challengeSlug,
            eventSlug,
            streamNickname: streamPhoto?.profile?.nickname,
          });

          const shortId = photo.short_id || photo.id;
          const likesCount = (shortId ? batchLikesMap.get(shortId) : undefined) ?? photo.likes_count ?? 0;

          return (
            <PhotoGridTile
              key={getPhotoGridItemKey(photo, index)}
              photo={photo}
              likesCount={likesCount}
              photoHref={href}
              nickname={nickname}
              showAttribution={showAttribution}
              captionMode={captionMode}
              gridDensity={gridDensity}
              canHover={hasHover}
              imageSrc={photo.url}
              sizes={tileSizes}
              quality={SQUARE_TILE_QUALITY}
              className="aspect-square"
              squareCrop
            />
          );
        })}
      </div>
    </div>
  );
}
