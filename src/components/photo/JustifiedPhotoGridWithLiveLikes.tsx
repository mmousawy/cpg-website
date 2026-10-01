'use client';

import { useBatchPhotoLikeCounts } from '@/hooks/useBatchLikeCounts';
import JustifiedPhotoGridCore from './JustifiedPhotoGridCore';
import type { JustifiedPhotoGridProps } from './justifiedPhotoGridTypes';

type JustifiedPhotoGridWithLiveLikesProps = Omit<
  JustifiedPhotoGridProps,
  'liveLikeCounts' | 'gridStyle' | 'gridDensity' | 'captions'
> & Pick<
  import('./justifiedPhotoGridTypes').JustifiedPhotoGridCoreProps,
  | 'captionMode'
  | 'gridDensity'
  | 'targetRowHeightMobile'
  | 'targetRowHeightTablet'
  | 'targetRowHeightDesktop'
>;

export default function JustifiedPhotoGridWithLiveLikes(props: JustifiedPhotoGridWithLiveLikesProps) {
  const { photos, ...rest } = props;

  const shortIds = photos
    .map((p) => p.short_id || p.id)
    .filter((id): id is string => !!id);

  const batchLikesQuery = useBatchPhotoLikeCounts(shortIds);
  const batchLikesMap = batchLikesQuery.data || new Map<string, number>();

  return (
    <JustifiedPhotoGridCore
      photos={photos}
      batchLikesMap={batchLikesMap}
      {...rest}
    />
  );
}
