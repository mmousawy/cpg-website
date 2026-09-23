'use client';

import {
  useEffectivePhotoCaptionsMode,
  useEffectivePhotoGridDensity,
  useEffectivePhotoGridStyle,
} from '@/hooks/useDisplayPreferences';
import { getJustifiedDensityLayout } from '@/utils/displayPreferences';

import JustifiedPhotoGridCore from './JustifiedPhotoGridCore';
import JustifiedPhotoGridWithLiveLikes from './JustifiedPhotoGridWithLiveLikes';
import SquarePhotoGridCore from './SquarePhotoGridCore';
import SquarePhotoGridWithLiveLikes from './SquarePhotoGridWithLiveLikes';
import type { JustifiedPhotoGridProps } from './justifiedPhotoGridTypes';

export type { JustifiedPhotoGridProps } from './justifiedPhotoGridTypes';

const EMPTY_LIKES_MAP = new Map<string, number>();

/**
 * Responsive photo grid (justified or square) using the user's display preferences.
 */
export default function JustifiedPhotoGrid({
  liveLikeCounts = true,
  gridStyle: gridStyleOverride,
  gridDensity: gridDensityOverride,
  captions: captionsOverride,
  maxRowHeight,
  ...props
}: JustifiedPhotoGridProps) {
  const gridStyle = useEffectivePhotoGridStyle(gridStyleOverride);
  const gridDensity = useEffectivePhotoGridDensity(gridDensityOverride);
  const captionMode = useEffectivePhotoCaptionsMode(captionsOverride);
  const densityLayout = getJustifiedDensityLayout(gridDensity, maxRowHeight);

  const justifiedLayoutProps = {
    maxRowHeight: densityLayout.maxRowHeight,
    targetRowHeightMobile: densityLayout.targetRowHeightMobile,
    targetRowHeightTablet: densityLayout.targetRowHeightTablet,
    targetRowHeightDesktop: densityLayout.targetRowHeightDesktop,
    captionMode,
    gridDensity,
  };

  if (gridStyle === 'square') {
    if (liveLikeCounts === false) {
      return (
        <SquarePhotoGridCore
          {...props}
          batchLikesMap={EMPTY_LIKES_MAP}
          gridDensity={gridDensity}
          captionMode={captionMode}
        />
      );
    }

    return (
      <SquarePhotoGridWithLiveLikes
        {...props}
        gridDensity={gridDensity}
        captionMode={captionMode}
      />
    );
  }

  if (liveLikeCounts === false) {
    return (
      <JustifiedPhotoGridCore
        {...props}
        {...justifiedLayoutProps}
        batchLikesMap={EMPTY_LIKES_MAP}
      />
    );
  }

  return (
    <JustifiedPhotoGridWithLiveLikes
      {...props}
      {...justifiedLayoutProps}
    />
  );
}
