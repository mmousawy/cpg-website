'use client';

import type { SceneEventInterested } from '@/lib/data/scene';
import type { SceneEvent } from '@/types/scene';
import dynamic from 'next/dynamic';

function RelatedEventsSliderPlaceholder() {
  return (
    <div
      className="min-h-48 animate-pulse rounded-xl border border-border-color bg-background-light"
      aria-hidden="true"
    />
  );
}

const RelatedEventsSlider = dynamic(
  () => import('./RelatedEventsSlider'),
  {
    ssr: false,
    loading: () => <RelatedEventsSliderPlaceholder />,
  },
);

type RelatedEventsSliderWrapperProps = {
  events: SceneEvent[];
  interestedByEvent: Record<string, SceneEventInterested[]>;
  cityName: string;
};

export default function RelatedEventsSliderWrapper({
  events,
  interestedByEvent,
  cityName,
}: RelatedEventsSliderWrapperProps) {
  return (
    <RelatedEventsSlider
      events={events}
      interestedByEvent={interestedByEvent}
      cityName={cityName}
    />
  );
}
