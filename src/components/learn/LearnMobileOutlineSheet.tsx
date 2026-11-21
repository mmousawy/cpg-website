'use client';

import clsx from 'clsx';

import BottomSheet from '@/components/shared/BottomSheet';
import { routes } from '@/config/routes';
import { getLearnLessonBySlug } from '@/content/learn';
import { useLearnSlideIndex } from '@/hooks/useLearnSlideIndex';
import { slideHash } from '@/lib/learn/navigation';
import { learnSlideNavLabel } from '@/lib/learn/slideLabel';

import ArrowLeftIcon from 'public/icons/arrow-left.svg';

import LearnSidebar from './LearnSidebar';

export type LearnMobileOutlineView = 'topics' | 'pages';

type LearnMobileOutlineSheetProps = {
  open: boolean;
  view: LearnMobileOutlineView;
  lessonSlug: string | null;
  onClose: () => void;
  onViewChange: (view: LearnMobileOutlineView) => void;
  onTopicChosen: (slug: string) => void;
};

export default function LearnMobileOutlineSheet({
  open,
  view,
  lessonSlug,
  onClose,
  onViewChange,
  onTopicChosen,
}: LearnMobileOutlineSheetProps) {
  const lesson = lessonSlug ? getLearnLessonBySlug(lessonSlug) : undefined;
  const slideCount = lesson?.slides.length ?? 0;
  const activeIndex = useLearnSlideIndex(slideCount);
  const showingPages = view === 'pages' && lesson != null && slideCount > 0;

  const goToSlide = (index: number) => {
    if (!lessonSlug) return;
    const url = `${routes.learn.url}/${lessonSlug}${slideHash(index)}`;
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` === url) {
      onClose();
      return;
    }
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    onClose();
  };

  return (
    <BottomSheet
      isOpen={open}
      onClose={onClose}
      title={showingPages ? lesson.title : 'Topics'}
      maxHeight={85}
    >
      <div
        className="h-full min-h-0 overflow-y-auto px-3 py-4"
      >
        {showingPages ? (
          <>
            <button
              type="button"
              onClick={() => onViewChange('topics')}
              className="mb-3 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-background-medium hover:text-foreground"
            >
              <ArrowLeftIcon
                className="size-3.5 shrink-0 fill-current"
                aria-hidden
              />
              All topics
            </button>
            <ol
              className="flex flex-col gap-0.5"
            >
              {lesson.slides.map((entry, slideIndex) => {
                const isActive = slideIndex === activeIndex;
                const label = learnSlideNavLabel(entry, slideIndex);
                return (
                  <li
                    key={`${lesson.slug}-${slideIndex}`}
                  >
                    <button
                      type="button"
                      onClick={() => goToSlide(slideIndex)}
                      className={clsx(
                        'grid w-full grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2 rounded-lg py-2 pr-2 pl-1 text-left text-sm transition-colors',
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
                        {slideIndex + 1}
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
          </>
        ) : (
          <LearnSidebar
            onTopicChosen={(slug) => {
              onTopicChosen(slug);
              onViewChange('pages');
            }}
          />
        )}
      </div>
    </BottomSheet>
  );
}
