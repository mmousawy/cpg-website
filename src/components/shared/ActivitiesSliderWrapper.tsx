'use client';

import dynamic from 'next/dynamic';

// Dynamic import with ssr: false to avoid Swiper's Date usage during SSR
const ActivitiesSlider = dynamic(
  () => import('./ActivitiesSlider'),
  { ssr: false }
);

export default function ActivitiesSliderWrapper() {
  return <ActivitiesSlider />;
}
