'use client';

import dynamic from 'next/dynamic';

// Dynamic import with ssr: false to avoid Swiper's Date usage during prerender
const ActivitiesSlider = dynamic(
  () => import('./ActivitiesSlider'),
  { ssr: false },
);

export default function ActivitiesSliderWrapper() {
  return (
    <div
      className="min-h-44 min-w-0 sm:min-h-28"
    >
      <ActivitiesSlider />
    </div>
  );
}
