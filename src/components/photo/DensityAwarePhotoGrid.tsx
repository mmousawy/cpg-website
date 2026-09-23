'use client';

import { useEffectivePhotoGridDensity } from '@/hooks/useDisplayPreferences';
import type { StreamPhoto } from '@/lib/data/gallery';
import {
  getPhotoGridLimitForDensity,
  type PhotoGridSectionLimits,
} from '@/utils/displayPreferences';

import JustifiedPhotoGrid from './JustifiedPhotoGrid';
import type { JustifiedPhotoGridProps } from './justifiedPhotoGridTypes';

type DensityAwarePhotoGridProps = Omit<JustifiedPhotoGridProps, 'photos'> & {
  photos: StreamPhoto[];
  /** Defaults to homepage/gallery section limits (10 / 16). */
  sectionLimits?: PhotoGridSectionLimits;
};

/**
 * Trims photo lists by grid density (default 10 comfortable / 16 compact).
 */
export default function DensityAwarePhotoGrid({
  photos,
  gridDensity: gridDensityOverride,
  sectionLimits,
  ...props
}: DensityAwarePhotoGridProps) {
  const density = useEffectivePhotoGridDensity(gridDensityOverride);
  const limit = getPhotoGridLimitForDensity(density, sectionLimits);
  const visiblePhotos = photos.slice(0, limit);

  return (
    <JustifiedPhotoGrid
      photos={visiblePhotos}
      gridDensity={gridDensityOverride}
      {...props}
    />
  );
}
