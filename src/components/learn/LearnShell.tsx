'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { routes } from '@/config/routes';
import { learnLessonSlugFromPath } from '@/lib/learn/lessonPath';

import LearnLessonSlidesSidebar from './LearnLessonSlidesSidebar';
import LearnMobileOutlineSheet, {
  type LearnMobileOutlineView,
} from './LearnMobileOutlineSheet';
import LearnSidebar from './LearnSidebar';
import { LearnTopicsContext } from './LearnTopicsContext';

type LearnShellProps = {
  children: ReactNode;
};

const PANEL_MS = 300;

export default function LearnShell({ children }: LearnShellProps) {
  const pathname = usePathname();
  const activeLessonSlug = learnLessonSlugFromPath(pathname);
  const onLearnOverview = pathname === routes.learn.url;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileView, setMobileView] = useState<LearnMobileOutlineView>('topics');

  /** Lesson shown in the overlay — set on topic click, before the page finishes loading. */
  const [panelSlug, setPanelSlug] = useState<string | null>(activeLessonSlug);
  const [lessonPanelOpen, setLessonPanelOpen] = useState(() => Boolean(activeLessonSlug));
  const openFrameRef = useRef(0);

  useEffect(() => {
    if (activeLessonSlug) {
      setPanelSlug(activeLessonSlug);
      setLessonPanelOpen(true);
      return;
    }
    setLessonPanelOpen(false);
  }, [activeLessonSlug]);

  const openMenu = useCallback(() => {
    setMobileView(activeLessonSlug ? 'pages' : 'topics');
    setMobileOpen(true);
  }, [activeLessonSlug]);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const backToTopics = useCallback(() => {
    setLessonPanelOpen(false);
  }, []);

  const openLessonPanel = useCallback((slug: string) => {
    setPanelSlug(slug);
    window.cancelAnimationFrame(openFrameRef.current);
    setLessonPanelOpen((wasOpen) => {
      if (wasOpen) {
        return true;
      }
      openFrameRef.current = window.requestAnimationFrame(() => {
        openFrameRef.current = window.requestAnimationFrame(() => {
          setLessonPanelOpen(true);
        });
      });
      return false;
    });
  }, []);

  useEffect(() => () => window.cancelAnimationFrame(openFrameRef.current), []);

  const clearPanelSlugIfIdle = useCallback(() => {
    if (activeLessonSlug) return;
    setPanelSlug(null);
  }, [activeLessonSlug]);

  useEffect(() => {
    if (lessonPanelOpen || activeLessonSlug || !panelSlug) return;
    const timer = window.setTimeout(clearPanelSlugIfIdle, PANEL_MS + 50);
    return () => window.clearTimeout(timer);
  }, [lessonPanelOpen, activeLessonSlug, panelSlug, clearPanelSlugIfIdle]);

  const topicsValue = useMemo(() => ({ openMenu }), [openMenu]);

  return (
    <LearnTopicsContext.Provider
      value={topicsValue}
    >
      <div
        className="learn-shell flex h-full min-h-0 w-full flex-1 flex-col sm:flex-row"
      >
        <div
          className="relative z-10 hidden w-56 shrink-0 overflow-hidden border-r border-border-color sm:block lg:w-64"
        >
          <aside
            className="absolute inset-0 overflow-y-auto bg-background-light px-3 py-4"
            aria-hidden={lessonPanelOpen}
            inert={lessonPanelOpen ? true : undefined}
          >
            <Link
              href={routes.learn.url}
              prefetch={false}
              tabIndex={lessonPanelOpen ? -1 : undefined}
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
            <LearnSidebar
              onTopicChosen={openLessonPanel}
            />
          </aside>

          <div
            className={clsx(
              'pointer-events-none absolute inset-0 z-10 bg-black/45 transition-opacity duration-300 ease-out motion-reduce:transition-none',
              lessonPanelOpen ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden
          />

          {panelSlug ? (
            <LearnLessonSlidesSidebar
              slug={panelSlug}
              open={lessonPanelOpen}
              onBack={backToTopics}
              onClosed={clearPanelSlugIfIdle}
            />
          ) : null}
        </div>

        <div
          className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          {children}
        </div>
      </div>

      <div
        className="sm:hidden"
      >
        <LearnMobileOutlineSheet
          open={mobileOpen}
          view={mobileView}
          lessonSlug={panelSlug ?? activeLessonSlug}
          onClose={closeMobile}
          onViewChange={setMobileView}
          onTopicChosen={openLessonPanel}
        />
      </div>
    </LearnTopicsContext.Provider>
  );
}
