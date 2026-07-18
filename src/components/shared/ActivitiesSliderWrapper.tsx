'use client';

import dynamic from 'next/dynamic';

function ActivitiesSliderPlaceholder() {
  return (
    <div
      className="min-h-44 animate-pulse rounded-xl border border-border-color bg-background-light sm:min-h-28"
      aria-hidden="true"
    />
  );
}

// Dynamic import with ssr: false to avoid Swiper's Date usage during SSR
const ActivitiesSlider = dynamic(
  () => import('./ActivitiesSlider'),
  {
    ssr: false,
    loading: () => <ActivitiesSliderPlaceholder />,
  },
);

export default function ActivitiesSliderWrapper() {
  return <ActivitiesSlider />;
}
