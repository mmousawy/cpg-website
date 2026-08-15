'use client';

import JustifiedPhotoGridCore from './JustifiedPhotoGridCore';
import JustifiedPhotoGridWithLiveLikes from './JustifiedPhotoGridWithLiveLikes';
import type { JustifiedPhotoGridProps } from './justifiedPhotoGridTypes';

const EMPTY_LIKES_MAP = new Map<string, number>();

export type { JustifiedPhotoGridProps } from './justifiedPhotoGridTypes';

/**
 * Responsive justified photo grid
 * Calculates layouts for different breakpoints and shows appropriate one via CSS
 */
export default function JustifiedPhotoGrid({
  liveLikeCounts = true,
  ...props
}: JustifiedPhotoGridProps) {
  if (liveLikeCounts === false) {
    return (
      <JustifiedPhotoGridCore
        {...props}
        batchLikesMap={EMPTY_LIKES_MAP}
      />
    );
  }

  return <JustifiedPhotoGridWithLiveLikes
    {...props}
  />;
}
