'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
    >
      {isNearViewport ? <ActivitiesSlider /> : <ActivitiesSliderPlaceholder />}
    </div>
  );
}
