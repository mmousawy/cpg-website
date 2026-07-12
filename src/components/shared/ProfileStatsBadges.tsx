'use client';

import {
  AlbumsIcon,
  ChallengePhotosAcceptedIcon,
  ChallengesParticipatedIcon,
  CommentsMadeIcon,
  CommentsReceivedIcon,
  EventsAttendedIcon,
  LikesGivenIcon,
  LikesReceivedIcon,
  MemberSinceIcon,
  PhotosIcon,
  ViewsReceivedIcon,
} from '@/components/icons/profile-stats';
import {
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Swiper as SwiperType } from 'swiper';
import { A11y } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';

type ProfileStats = {
  photos: number;
  albums: number;
  eventsAttended: number;
  commentsMade: number;
  commentsReceived: number;
  likesReceived: number;
  likesGiven: number;
  viewsReceived: number;
  memberSince: string | null;
  challengesParticipated?: number;
  challengePhotosAccepted?: number;
};

type ProfileStatsBadgesProps = {
  stats: ProfileStats;
};

type Badge = {
  icon: ReactNode;
  value: string;
  label: string;
  suffix?: string;
  title?: string;
  baseClass: string;
  hoverClass: string;
};

function NavButton({
  direction,
  className,
  onNavigate,
  disabled,
}: {
  direction: 'prev' | 'next';
  className?: string;
  onNavigate: (direction: 'prev' | 'next') => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(direction)}
      disabled={disabled}
      className={`flex size-10 items-center justify-center rounded-full border border-border-color-strong bg-background-light shadow-sm transition-all hover:border-primary text-primary disabled:opacity-30 disabled:cursor-not-allowed ${className || ''}`}
      aria-label={direction === 'prev' ? 'Scroll achievements left' : 'Scroll achievements right'}
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

function getOrdinalSuffix(day: number) {
  if (day >= 11 && day <= 13) {
    return 'th';
  }

  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

export default function ProfileStatsBadges({ stats }: ProfileStatsBadgesProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const badges: Badge[] = [];

  const memberSinceDate = stats.memberSince ? new Date(stats.memberSince) : null;
  const hasValidMemberSinceDate = !!memberSinceDate && !Number.isNaN(memberSinceDate.getTime());
  const memberSinceValue = hasValidMemberSinceDate
    ? memberSinceDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
    : null;

  const memberSinceExactDate = hasValidMemberSinceDate
    ? `${memberSinceDate.toLocaleDateString('en-US', { month: 'long' })} ${memberSinceDate.getDate()}${getOrdinalSuffix(memberSinceDate.getDate())} ${memberSinceDate.getFullYear()}`
    : null;

  if (memberSinceValue && memberSinceExactDate) {
    badges.push({
      icon: (
        <MemberSinceIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: memberSinceValue,
      label: 'Member since',
      title: memberSinceExactDate,
      baseClass: 'bg-amber-500/4 ring-amber-500/12 shadow-amber-500/8 [&_.badge-icon]:text-amber-700 dark:bg-amber-400/5 dark:ring-amber-300/18 dark:[&_.badge-icon]:text-amber-300',
      hoverClass: 'hover:bg-amber-500/8 hover:ring-amber-500/25 hover:shadow-amber-500/20 hover:[&_.badge-icon]:text-amber-600 dark:hover:bg-amber-400/10 dark:hover:ring-amber-300/25 dark:hover:[&_.badge-icon]:text-amber-300',
    });
  }

  if (stats.photos > 0) {
    badges.push({
      icon: (
        <PhotosIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.photos.toLocaleString(),
      label: stats.photos === 1 ? 'Photo' : 'Photos',
      baseClass: 'bg-sky-500/4 ring-sky-500/12 shadow-sky-500/8 [&_.badge-icon]:text-sky-700 dark:bg-sky-400/5 dark:ring-sky-300/18 dark:[&_.badge-icon]:text-sky-300',
      hoverClass: 'hover:bg-sky-500/8 hover:ring-sky-500/25 hover:shadow-sky-500/20 hover:[&_.badge-icon]:text-sky-600 dark:hover:bg-sky-400/10 dark:hover:ring-sky-300/25 dark:hover:[&_.badge-icon]:text-sky-300',
    });
  }

  if (stats.albums > 0) {
    badges.push({
      icon: (
        <AlbumsIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.albums.toLocaleString(),
      label: stats.albums === 1 ? 'Album' : 'Albums',
      baseClass: 'bg-fuchsia-500/4 ring-fuchsia-500/12 shadow-fuchsia-500/8 [&_.badge-icon]:text-fuchsia-700 dark:bg-fuchsia-400/5 dark:ring-fuchsia-300/18 dark:[&_.badge-icon]:text-fuchsia-300',
      hoverClass: 'hover:bg-fuchsia-500/8 hover:ring-fuchsia-500/25 hover:shadow-fuchsia-500/20 hover:[&_.badge-icon]:text-fuchsia-600 dark:hover:bg-fuchsia-400/10 dark:hover:ring-fuchsia-300/25 dark:hover:[&_.badge-icon]:text-fuchsia-300',
    });
  }

  if (stats.eventsAttended > 0) {
    badges.push({
      icon: (
        <EventsAttendedIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.eventsAttended.toLocaleString(),
      label: stats.eventsAttended === 1 ? 'Event' : 'Events',
      suffix: ' attended',
      baseClass: 'bg-emerald-500/4 ring-emerald-500/12 shadow-emerald-500/8 [&_.badge-icon]:text-emerald-700 dark:bg-emerald-400/5 dark:ring-emerald-300/18 dark:[&_.badge-icon]:text-emerald-300',
      hoverClass: 'hover:bg-emerald-500/8 hover:ring-emerald-500/25 hover:shadow-emerald-500/20 hover:[&_.badge-icon]:text-emerald-600 dark:hover:bg-emerald-400/10 dark:hover:ring-emerald-300/25 dark:hover:[&_.badge-icon]:text-emerald-300',
    });
  }

  if (stats.commentsMade > 0) {
    badges.push({
      icon: (
        <CommentsMadeIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.commentsMade.toLocaleString(),
      label: stats.commentsMade === 1 ? 'Comment' : 'Comments',
      suffix: ' made',
      baseClass: 'bg-cyan-500/4 ring-cyan-500/12 shadow-cyan-500/8 [&_.badge-icon]:text-cyan-700 dark:bg-cyan-400/5 dark:ring-cyan-300/18 dark:[&_.badge-icon]:text-cyan-300',
      hoverClass: 'hover:bg-cyan-500/8 hover:ring-cyan-500/25 hover:shadow-cyan-500/20 hover:[&_.badge-icon]:text-cyan-600 dark:hover:bg-cyan-400/10 dark:hover:ring-cyan-300/25 dark:hover:[&_.badge-icon]:text-cyan-300',
    });
  }

  if (stats.commentsReceived > 0) {
    badges.push({
      icon: (
        <CommentsReceivedIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.commentsReceived.toLocaleString(),
      label: stats.commentsReceived === 1 ? 'Comment' : 'Comments',
      suffix: ' received',
      baseClass: 'bg-teal-500/4 ring-teal-500/12 shadow-teal-500/8 [&_.badge-icon]:text-teal-700 dark:bg-teal-400/5 dark:ring-teal-300/18 dark:[&_.badge-icon]:text-teal-300',
      hoverClass: 'hover:bg-teal-500/8 hover:ring-teal-500/25 hover:shadow-teal-500/20 hover:[&_.badge-icon]:text-teal-600 dark:hover:bg-teal-400/10 dark:hover:ring-teal-300/25 dark:hover:[&_.badge-icon]:text-teal-300',
    });
  }

  if (stats.likesGiven > 0) {
    badges.push({
      icon: (
        <LikesGivenIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.likesGiven.toLocaleString(),
      label: stats.likesGiven === 1 ? 'Like' : 'Likes',
      suffix: ' given',
      baseClass: 'bg-orange-500/4 ring-orange-500/12 shadow-orange-500/8 [&_.badge-icon]:text-orange-700 dark:bg-orange-400/5 dark:ring-orange-300/18 dark:[&_.badge-icon]:text-orange-300',
      hoverClass: 'hover:bg-orange-500/8 hover:ring-orange-500/25 hover:shadow-orange-500/20 hover:[&_.badge-icon]:text-orange-600 dark:hover:bg-orange-400/10 dark:hover:ring-orange-300/25 dark:hover:[&_.badge-icon]:text-orange-300',
    });
  }

  if (stats.likesReceived > 0) {
    badges.push({
      icon: (
        <LikesReceivedIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.likesReceived.toLocaleString(),
      label: stats.likesReceived === 1 ? 'Like' : 'Likes',
      suffix: ' received',
      baseClass: 'bg-rose-500/4 ring-rose-500/12 shadow-rose-500/8 [&_.badge-icon]:text-rose-700 dark:bg-rose-400/5 dark:ring-rose-300/18 dark:[&_.badge-icon]:text-rose-300',
      hoverClass: 'hover:bg-rose-500/8 hover:ring-rose-500/25 hover:shadow-rose-500/20 hover:[&_.badge-icon]:text-rose-600 dark:hover:bg-rose-400/10 dark:hover:ring-rose-300/25 dark:hover:[&_.badge-icon]:text-rose-300',
    });
  }

  if (stats.viewsReceived > 0) {
    badges.push({
      icon: (
        <ViewsReceivedIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.viewsReceived.toLocaleString(),
      label: stats.viewsReceived === 1 ? 'View' : 'Views',
      suffix: ' received',
      baseClass: 'bg-indigo-500/4 ring-indigo-500/12 shadow-indigo-500/8 [&_.badge-icon]:text-indigo-700 dark:bg-indigo-400/5 dark:ring-indigo-300/18 dark:[&_.badge-icon]:text-indigo-300',
      hoverClass: 'hover:bg-indigo-500/8 hover:ring-indigo-500/25 hover:shadow-indigo-500/20 hover:[&_.badge-icon]:text-indigo-600 dark:hover:bg-indigo-400/10 dark:hover:ring-indigo-300/25 dark:hover:[&_.badge-icon]:text-indigo-300',
    });
  }

  if (stats.challengesParticipated && stats.challengesParticipated > 0) {
    badges.push({
      icon: (
        <ChallengesParticipatedIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.challengesParticipated.toLocaleString(),
      label: stats.challengesParticipated === 1 ? 'Challenge' : 'Challenges',
      suffix: ' entered',
      baseClass: 'bg-pink-500/4 ring-pink-500/12 shadow-pink-500/8 [&_.badge-icon]:text-pink-700 dark:bg-pink-400/5 dark:ring-pink-300/18 dark:[&_.badge-icon]:text-pink-300',
      hoverClass: 'hover:bg-pink-500/8 hover:ring-pink-500/25 hover:shadow-pink-500/20 hover:[&_.badge-icon]:text-pink-600 dark:hover:bg-pink-400/10 dark:hover:ring-pink-300/25 dark:hover:[&_.badge-icon]:text-pink-300',
    });
  }

  if (stats.challengePhotosAccepted && stats.challengePhotosAccepted > 0) {
    badges.push({
      icon: (
        <ChallengePhotosAcceptedIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.challengePhotosAccepted.toLocaleString(),
      label: 'Challenge',
      suffix: stats.challengePhotosAccepted === 1 ? ' submission' : ' submissions',
      baseClass: 'bg-lime-500/4 ring-lime-500/12 shadow-lime-500/8 [&_.badge-icon]:text-lime-700 dark:bg-lime-400/5 dark:ring-lime-300/18 dark:[&_.badge-icon]:text-lime-300',
      hoverClass: 'hover:bg-lime-500/8 hover:ring-lime-500/30 hover:shadow-lime-500/20 hover:[&_.badge-icon]:text-lime-600 dark:hover:bg-lime-400/10 dark:hover:ring-lime-300/30 dark:hover:[&_.badge-icon]:text-lime-300',
    });
  }

  if (badges.length === 0) {
    return null;
  }

  const syncEdges = (swiper: SwiperType) => {
    setCanScrollLeft(!swiper.isBeginning);
    setCanScrollRight(!swiper.isEnd);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      swiperRef.current?.slidePrev();
    } else {
      swiperRef.current?.slideNext();
    }
  };

  return (
    <div
      className="mt-8"
    >
      <h2
        className="mb-3 sm:mb-4 text-xl font-semibold font-heading"
      >
        Achievements
      </h2>

      <div
        className="relative"
      >
        <div
          className="hidden sm:block absolute -left-12 top-1/2 z-20 -translate-y-1/2"
        >
          <NavButton
            direction="prev"
            onNavigate={handleNavigate}
            disabled={!canScrollLeft}
          />
        </div>

        <div
          className="w-screen relative left-1/2 -translate-x-1/2 sm:w-auto sm:left-0 sm:translate-x-0"
        >
          <Swiper
            modules={[A11y]}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
              syncEdges(swiper);
            }}
            onSlideChange={syncEdges}
            onResize={syncEdges}
            slidesPerView="auto"
            spaceBetween={8}
            slidesOffsetBefore={12}
            slidesOffsetAfter={12}
            breakpoints={{
              640: {
                slidesOffsetBefore: 0,
                slidesOffsetAfter: 0,
              },
            }}
            grabCursor
            className="[&_.swiper-wrapper]:items-stretch [&_.swiper-wrapper]:pb-4"
          >
            {badges.map((badge, index) => (
              <SwiperSlide
                key={`${badge.label}-${index}`}
                className="h-auto! w-auto! flex!"
                title={badge.title}
              >
                <div
                  className={`group badge-gradient rounded-md shrink-0 w-24 sm:w-30 h-full px-3 py-2 sm:py-4 flex flex-col items-center justify-center text-center ring-1 shadow-lg shadow-foreground/3 transition-all duration-300 ${badge.baseClass} ${badge.hoverClass}`}
                >
                  <div
                    className="mb-1 sm:mb-2"
                  >
                    <div
                      className="badge-icon size-6 sm:size-8 text-primary transition-colors flex items-center justify-center"
                    >
                      {badge.icon}
                    </div>
                  </div>
                  <p
                    className="text-sm sm:text-lg font-bold text-foreground mb-0.5"
                  >
                    {badge.value}
                  </p>
                  <p
                    className="text-[10px] sm:text-xs text-foreground/60 leading-tight"
                  >
                    {badge.label}
                    {badge.suffix && ` ${badge.suffix}`}
                  </p>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <div
            className={`hidden sm:block pointer-events-none absolute z-10 left-0 top-0 bottom-0 w-12 bg-linear-to-r from-background via-background/80 to-transparent transition-opacity duration-200 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}
          />
          <div
            className={`hidden sm:block pointer-events-none absolute z-10 right-0 top-0 bottom-0 w-12 bg-linear-to-l from-background via-background/80 to-transparent transition-opacity duration-200 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>

        <div
          className="hidden sm:block absolute -right-12 top-1/2 z-20 -translate-y-1/2"
        >
          <NavButton
            direction="next"
            onNavigate={handleNavigate}
            disabled={!canScrollRight}
          />
        </div>
      </div>
    </div>
  );
}
