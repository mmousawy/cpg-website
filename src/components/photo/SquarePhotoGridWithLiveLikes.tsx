'use client';

import { useBatchPhotoLikeCounts } from '@/hooks/useBatchLikeCounts';
import type { PhotoCaptionsMode, PhotoGridDensity } from '@/utils/displayPreferences';

import SquarePhotoGridCore from './SquarePhotoGridCore';
import type { JustifiedPhotoGridProps } from './justifiedPhotoGridTypes';

type SquarePhotoGridWithLiveLikesProps = Omit<JustifiedPhotoGridProps, 'liveLikeCounts'> & {
  gridDensity: PhotoGridDensity;
  captionMode: PhotoCaptionsMode;
};

export default function SquarePhotoGridWithLiveLikes({
  photos,
  gridDensity,
  captionMode,
  ...rest
}: SquarePhotoGridWithLiveLikesProps) {
  const shortIds = photos
    .map((p) => p.short_id || p.id)
    .filter((id): id is string => !!id);

  const batchLikesQuery = useBatchPhotoLikeCounts(shortIds);
  const batchLikesMap = batchLikesQuery.data || new Map<string, number>();

  return (
    <SquarePhotoGridCore
      photos={photos}
      batchLikesMap={batchLikesMap}
      gridDensity={gridDensity}
      captionMode={captionMode}
      {...rest}
    />
  );
}
