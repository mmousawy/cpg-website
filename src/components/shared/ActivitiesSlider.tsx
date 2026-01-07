'use client';

import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

import 'swiper/css';

// Navigation button component - defined outside to avoid React Compiler warning
function NavButton({
  direction,
  className,
  onNavigate,
}: {
  direction: 'prev' | 'next';
  className?: string;
  onNavigate: (direction: 'prev' | 'next') => void;
}) {
  return (
    <button
      onClick={() => onNavigate(direction)}
      className={`flex size-10 items-center justify-center rounded-full border border-border-color-strong bg-background-light shadow-sm transition-all hover:border-primary hover:border-primary text-primary ${className || ''}`}
      aria-label={direction === 'prev' ? 'Previous slide' : 'Next slide'}
    >
      <svg className="size-5 text-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={direction === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  );
}

const activities = [
  {
    title: 'Monthly meetups',
    description: 'Connect, socialize, inspire and share ideas in a social and cozy vibe',
    color: 'amber',
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: 'Photo challenges',
    description: 'Spur creativity with monthly prompts & share results to learn and inspire',
    color: 'rose',
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    title: 'Talks & skill sharing',
    description: 'Learn from the community, exchange ideas & learn new techniques',
    color: 'violet',
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    title: 'Collaborative projects',
    description: 'Swap film, exchange equipment and create and collaborate on projects',
    color: 'cyan',
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    title: 'Photo walks',
    description: 'Get out, explore the area, find new locations and shoot together',
    color: 'emerald',
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Excursions',
    description: 'Visit museums, parks and inspiring places together with the community',
    color: 'sky',
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
      </svg>
    ),
  },
];

const colorStyles: Record<string, { card: string; icon: string; title: string }> = {
  amber: {
    card: 'border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 hover:border-amber-500/40 hover:shadow-amber-500/5',
    icon: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    title: 'text-amber-700 dark:text-amber-300',
  },
  rose: {
    card: 'border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-pink-500/5 hover:border-rose-500/40 hover:shadow-rose-500/5',
    icon: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
    title: 'text-rose-700 dark:text-rose-300',
  },
  violet: {
    card: 'border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-purple-500/5 hover:border-violet-500/40 hover:shadow-violet-500/5',
    icon: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
    title: 'text-violet-700 dark:text-violet-300',
  },
  cyan: {
    card: 'border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-teal-500/5 hover:border-cyan-500/40 hover:shadow-cyan-500/5',
    icon: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
    title: 'text-cyan-700 dark:text-cyan-300',
  },
  emerald: {
    card: 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-green-500/5 hover:border-emerald-500/40 hover:shadow-emerald-500/5',
    icon: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-700 dark:text-emerald-300',
  },
  sky: {
    card: 'border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-blue-500/5 hover:border-sky-500/40 hover:shadow-sky-500/5',
    icon: 'bg-sky-500/20 text-sky-600 dark:text-sky-400',
    title: 'text-sky-700 dark:text-sky-300',
  },
};

// Activity card component - defined outside to avoid React Compiler warning
function ActivityCard({ activity }: { activity: typeof activities[0] }) {
  const styles = colorStyles[activity.color];
  return (
    <div className={`group flex h-full items-start gap-3 rounded-xl border p-4 transition-all hover:shadow-sm ${styles.card}`}>
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
        {activity.icon}
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-semibold ${styles.title}`}>{activity.title}</p>
        <p className="text-md text-foreground/80 mt-1">{activity.description}</p>
      </div>
    </div>
  );
}

export default function ActivitiesSlider() {
  const swiperRef = useRef<SwiperType | null>(null);

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      swiperRef.current?.slidePrev();
    } else {
      swiperRef.current?.slideNext();
    }
  };

  return (
    <>
      {/* No-JS fallback: static grid */}
      <noscript>
        <div className="grid gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <ActivityCard key={activity.title} activity={activity} />
          ))}
        </div>
      </noscript>

      {/* JS-enabled: interactive slider (hidden when JS disabled via noscript style) */}
      <div className="relative js-only-slider">
        <noscript>
          <style>{`.js-only-slider { display: none !important; }`}</style>
        </noscript>

        {/* Desktop navigation buttons - hidden on mobile */}
        <div className="hidden sm:block absolute left-0 top-1/2 z-20 -translate-y-1/2">
          <NavButton direction="prev" onNavigate={handleNavigate} />
        </div>
        <div className="hidden sm:block absolute right-0 top-1/2 z-20 -translate-y-1/2">
          <NavButton direction="next" onNavigate={handleNavigate} />
        </div>

        {/* Swiper - full viewport width on mobile, with fade mask on sm+ */}
        <div
          className="w-screen relative left-1/2 -translate-x-1/2 sm:w-auto sm:left-0 sm:translate-x-0 sm:[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
        >
          <Swiper
            modules={[Navigation, A11y]}
            onSwiper={(swiper) => { swiperRef.current = swiper; }}
            spaceBetween={24}
            slidesPerView={1}
            centeredSlides={true}
            slidesOffsetBefore={12}
            slidesOffsetAfter={12}
            breakpoints={{
              640: {
                slidesPerView: 2,
                slidesOffsetBefore: 0,
                slidesOffsetAfter: 0,
              },
            }}
            grabCursor
            loop
            className="[&_.swiper-wrapper]:items-stretch"
          >
            {activities.map((activity) => (
              <SwiperSlide key={activity.title} className="!h-auto">
                <ActivityCard activity={activity} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Mobile navigation buttons - below the slider */}
        <div className="flex sm:hidden justify-center gap-4 mt-4">
          <NavButton direction="prev" onNavigate={handleNavigate} />
          <NavButton direction="next" onNavigate={handleNavigate} />
        </div>
      </div>
    </>
  );
}
