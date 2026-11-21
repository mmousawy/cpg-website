'use client';

import clsx from 'clsx';
import { usePathname } from 'next/navigation';

import { getLearnLessonBySlug } from '@/content/learn';
import { useLearnSlideIndex } from '@/hooks/useLearnSlideIndex';
import { learnLessonSlugFromPath } from '@/lib/learn/lessonPath';
import { learnSlideNavLabel } from '@/lib/learn/slideLabel';
import { slideHash } from '@/lib/learn/navigation';

type LearnLessonSlidesSidebarProps = {
  open: boolean;
};

export default function LearnLessonSlidesSidebar({ open }: LearnLessonSlidesSidebarProps) {
  const pathname = usePathname();
  const slug = learnLessonSlugFromPath(pathname);
  const lesson = slug ? getLearnLessonBySlug(slug) : undefined;
  const slideCount = lesson?.slides.length ?? 0;
  const activeIndex = useLearnSlideIndex(slideCount);

  if (!open || !lesson || slideCount === 0) {
    return null;
  }

  const goToSlide = (index: number) => {
    const url = `${pathname}${slideHash(index)}`;
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` === url) {
      return;
    }
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  return (
    <aside
      className="relative z-10 hidden w-52 shrink-0 overflow-y-auto border-r border-border-color bg-background-light px-3 py-4 sm:block xl:w-56"
      aria-label="Lesson pages"
    >
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
