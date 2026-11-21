'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { routes } from '@/config/routes';
import { learnLessonSlugFromPath } from '@/lib/learn/lessonPath';

import BottomSheet from '@/components/shared/BottomSheet';

import LearnLessonSlidesSidebar from './LearnLessonSlidesSidebar';
import LearnSidebar from './LearnSidebar';
import { LearnTopicsContext } from './LearnTopicsContext';

type LearnShellProps = {
  children: ReactNode;
};

export default function LearnShell({ children }: LearnShellProps) {
  const pathname = usePathname();
  const activeLessonSlug = learnLessonSlugFromPath(pathname);
  const onLearnOverview = pathname === routes.learn.url;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lessonOutlineOpen, setLessonOutlineOpen] = useState(() => Boolean(activeLessonSlug));

  useEffect(() => {
    setLessonOutlineOpen(Boolean(activeLessonSlug));
  }, [activeLessonSlug]);

  const openTopics = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const closeTopics = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const topicsValue = useMemo(() => ({ openTopics }), [openTopics]);

  return (
    <LearnTopicsContext.Provider
      value={topicsValue}
    >
      <div
        className="learn-shell flex h-full min-h-0 w-full flex-1 flex-col sm:flex-row"
      >
        <aside
          className="relative z-10 hidden w-56 shrink-0 overflow-y-auto border-r border-border-color bg-background-light px-3 py-4 sm:block lg:w-64"
        >
          <Link
            href={routes.learn.url}
            prefetch={false}
            className={clsx(
              'mb-4 block rounded-lg px-2 py-1 font-heading text-base font-semibold transition-colors',
              onLearnOverview
                ? 'text-primary'
                : 'text-foreground hover:text-primary',
            )}
            aria-current={onLearnOverview ? 'page' : undefined}
          >
            {routes.learn.label}
          </Link>
          <LearnSidebar />
        </aside>

        <LearnLessonSlidesSidebar
          open={lessonOutlineOpen && Boolean(activeLessonSlug)}
        />

        <div
          className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          {children}
        </div>
      </div>

      <div
        className="sm:hidden"
      >
        <BottomSheet
          isOpen={mobileOpen}
          onClose={closeTopics}
          title="Topics"
          maxHeight={85}
        >
          <div
            className="h-full min-h-0 overflow-y-auto px-3 py-4"
          >
            <LearnSidebar
              onNavigate={closeTopics}
            />
          </div>
        </BottomSheet>
      </div>
    </LearnTopicsContext.Provider>
  );
}
