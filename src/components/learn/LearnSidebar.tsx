'use client';

import clsx from 'clsx';
import { usePathname } from 'next/navigation';

import { learnLessonSlugFromPath } from '@/lib/learn/lessonPath';

import LearnOutlineSections from './LearnOutlineSections';

type LearnSidebarProps = {
  className?: string;
  onNavigate?: () => void;
  onTopicChosen?: () => void;
};

export default function LearnSidebar({ className, onNavigate, onTopicChosen }: LearnSidebarProps) {
  const pathname = usePathname();
  const activeSlug = learnLessonSlugFromPath(pathname);

  return (
    <nav
      className={clsx('flex flex-col', className)}
      aria-label="Learn topics"
    >
      <LearnOutlineSections
        activeSlug={activeSlug}
        variant="sidebar"
        onNavigate={onNavigate}
        onTopicChosen={onTopicChosen}
      />
    </nav>
  );
}
