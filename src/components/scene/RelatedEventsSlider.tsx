'use client';

import type { SceneEventInterested } from '@/lib/data/scene';
import type { SceneEvent } from '@/types/scene';
import { useRef, useState } from 'react';
import type { Swiper as SwiperType } from 'swiper';
import { A11y, Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';

import SceneEventCard from './SceneEventCard';

function NavButton({
  direction,
  disabled,
  onNavigate,
}: {
  direction: 'prev' | 'next';
  disabled?: boolean;
  onNavigate: (direction: 'prev' | 'next') => void;
}) {
  return (
    <button
      onClick={() => onNavigate(direction)}
      disabled={disabled}
      className="flex size-10 items-center justify-center rounded-full border border-border-color-strong bg-background-light shadow-sm transition-all duration-200 hover:border-primary text-primary disabled:opacity-30 disabled:cursor-default disabled:hover:border-border-color-strong"
      aria-label={direction === 'prev' ? 'Previous slide' : 'Next slide'}
    >
      <svg
        className="size-5 text-foreground/70"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={direction === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  );
}

type RelatedEventsSliderProps = {
  events: SceneEvent[];
  interestedByEvent: Record<string, SceneEventInterested[]>;
  cityName: string;
};

export default function RelatedEventsSlider({
  events,
  interestedByEvent,
  cityName,
}: RelatedEventsSliderProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      swiperRef.current?.slidePrev();
    } else {
      swiperRef.current?.slideNext();
    }
  };

  const updateNavState = (swiper: SwiperType) => {
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
  };

  if (events.length === 0) return null;

  return (
    <section
      className="mt-8"
    >
      <h2
        className="text-lg font-semibold mb-4 opacity-70"
      >
        More events in
        {' '}
        {cityName}
      </h2>

      <div
        className="relative"
      >
        {/* Desktop nav buttons */}
        <div
          className="hidden sm:block absolute left-0 top-1/2 z-20 -translate-y-1/2"
        >
          <NavButton
            direction="prev"
            disabled={isBeginning}
            onNavigate={handleNavigate}
          />
        </div>
        <div
          className="hidden sm:block absolute right-0 top-1/2 z-20 -translate-y-1/2"
        >
          <NavButton
            direction="next"
            disabled={isEnd}
            onNavigate={handleNavigate}
          />
        </div>

        <div
          className="w-screen relative left-1/2 -translate-x-1/2 sm:w-auto sm:left-0 sm:translate-x-0 sm:mask-[linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
        >
          <Swiper
            modules={[Navigation, A11y]}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
              updateNavState(swiper);
            }}
            onSlideChange={updateNavState}
            onReachBeginning={updateNavState}
            onReachEnd={updateNavState}
            spaceBetween={12}
            slidesPerView={1}
            slidesOffsetBefore={8}
            slidesOffsetAfter={8}
            breakpoints={{
              640: {
                slidesPerView: 2,
                spaceBetween: 16,
                slidesOffsetBefore: 0,
                slidesOffsetAfter: 0,
              },
            }}
            grabCursor
            className="[&_.swiper-wrapper]:items-stretch"
          >
            {events.map((rel) => (
              <SwiperSlide
                key={rel.id}
                className="h-auto!"
              >
                <SceneEventCard
                  event={rel}
                  interested={interestedByEvent[rel.id] || []}
                  className="h-full"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Mobile nav buttons */}
        <div
          className="flex sm:hidden justify-center gap-4 mt-3"
        >
          <NavButton
            direction="prev"
            disabled={isBeginning}
            onNavigate={handleNavigate}
          />
          <NavButton
            direction="next"
            disabled={isEnd}
            onNavigate={handleNavigate}
          />
        </div>
      </div>
    </section>
  );
}
