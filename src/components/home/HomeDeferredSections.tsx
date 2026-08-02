'use client';

import dynamic from 'next/dynamic';

import JustifiedPhotoGridSkeleton from '@/components/photo/JustifiedPhotoGridSkeleton';
import type { JustifiedPhotoGridProps } from '@/components/photo/justifiedPhotoGridTypes';

const SignUpCTA = dynamic(() => import('@/components/shared/SignUpCTA'));

const JustifiedPhotoGrid = dynamic(
  () => import('@/components/photo/JustifiedPhotoGrid'),
  { loading: () => <JustifiedPhotoGridSkeleton /> },
);

const ActivitiesSliderWrapper = dynamic(
  () => import('@/components/shared/ActivitiesSliderWrapper'),
  {
    loading: () => (
      <div
        className="min-h-44 animate-pulse rounded-xl border border-border-color bg-background-light sm:min-h-28"
        aria-hidden="true"
      />
    ),
  },
);

export function HomeSignUpCTA() {
  return <SignUpCTA
    variant="banner"
  />;
}

export function HomeRecentPhotos({ photos }: { photos: JustifiedPhotoGridProps['photos'] }) {
  return (
    <JustifiedPhotoGrid
      photos={photos}
      showAttribution
      liveLikeCounts={false}
    />
  );
}

export function HomeActivitiesSlider() {
  return <ActivitiesSliderWrapper />;
}
