'use client';

import clsx from 'clsx';
import { type TransitionEvent } from 'react';

import { routes } from '@/config/routes';
import { getLearnLessonBySlug } from '@/content/learn';
import { useLearnSlideIndex } from '@/hooks/useLearnSlideIndex';
import { learnSlideNavLabel } from '@/lib/learn/slideLabel';
import { slideHash } from '@/lib/learn/navigation';

import ArrowLeftIcon from 'public/icons/arrow-left.svg';

type LearnLessonSlidesSidebarProps = {
  /** Lesson whose pages are shown — kept even while the panel animates closed. */
  slug: string;
  open: boolean;
  onBack: () => void;
  onClosed?: () => void;
};

export default function LearnLessonSlidesSidebar({
  slug,
  open,
  onBack,
  onClosed,
}: LearnLessonSlidesSidebarProps) {
  const lesson = getLearnLessonBySlug(slug);
  const slideCount = lesson?.slides.length ?? 0;
  const activeIndex = useLearnSlideIndex(slideCount);

  if (!lesson || slideCount === 0) {
    return null;
  }

  const goToSlide = (index: number) => {
    const url = `${routes.learn.url}/${slug}${slideHash(index)}`;
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` === url) {
      return;
    }
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  const handleTransitionEnd = (event: TransitionEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== 'transform') return;
    if (open) return;
    onClosed?.();
  };

  return (
    <aside
      className={clsx(
        'absolute inset-0 z-20 flex flex-col overflow-y-auto bg-background-light px-3 py-4',
        'transform-gpu transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none',
        open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
      )}
      aria-label="Lesson pages"
      aria-hidden={!open}
      inert={!open ? true : undefined}
      onTransitionEnd={handleTransitionEnd}
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-background-medium hover:text-foreground"
      >
        <ArrowLeftIcon
          className="size-3.5 shrink-0 fill-current"
          aria-hidden
        />
        All topics
      </button>
      <p
        className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-foreground"
      >
        {lesson.title}
      </p>
      <ol
        className="flex flex-col gap-0.5"
      >
        {lesson.slides.map((slide, index) => {
          const isActive = index === activeIndex;
          const label = learnSlideNavLabel(slide, index);
          return (
            <li
              key={`${slug}-${index}`}
            >
              <button
                type="button"
                onClick={() => goToSlide(index)}
                tabIndex={open ? undefined : -1}
                className={clsx(
                  'grid w-full grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2 rounded-lg py-1.5 pr-2 pl-1 text-left text-sm transition-colors',
                  isActive
                    ? 'bg-primary/15 font-medium text-primary'
                    : 'text-foreground hover:bg-background-medium',
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className="pt-px text-right font-(family-name:--font-geist-mono) text-xs leading-5 text-foreground/55 tabular-nums"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span
                  className="min-w-0 leading-5"
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
