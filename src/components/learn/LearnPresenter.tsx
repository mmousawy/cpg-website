'use client';

import clsx from 'clsx';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  mobileFixedBottomChromeClassName,
  mobileFloatingPillClassName,
  mobileFloatingPillInsetClassName,
  mobileStickyChromeZClassName,
} from '@/components/layout/mobileChrome';
import Button from '@/components/shared/Button';
import type { LearnLesson } from '@/content/learn/types';
import {
  clampSlideIndex,
  nextSlideIndex,
  parseSlideHash,
  previousSlideIndex,
  slideHash,
} from '@/lib/learn/navigation';

import ArrowLeftIcon from 'public/icons/arrow-left.svg';
import ArrowRightIcon from 'public/icons/arrow-right.svg';

import LearnSlideContent from './LearnSlideContent';
import { useLearnTopics } from './LearnTopicsContext';

type LearnPresenterProps = {
  lesson: LearnLesson;
};

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown', ' ', 'PageDown']);
const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp']);

export default function LearnPresenter({ lesson }: LearnPresenterProps) {
  const learnTopics = useLearnTopics();
  const slideCount = lesson.slides.length;
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const indexRef = useRef(index);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const goTo = useCallback(
    (next: number, { replaceHash = true }: { replaceHash?: boolean } = {}) => {
      const clamped = clampSlideIndex(next, slideCount);
      setIndex(clamped);
      if (replaceHash && typeof window !== 'undefined') {
        const hash = slideHash(clamped);
        const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
        if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextUrl) {
          window.history.replaceState(null, '', nextUrl);
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      }
    },
    [slideCount],
  );

  useLayoutEffect(() => {
    const initial = parseSlideHash(window.location.hash);
    if (initial !== null) {
      setIndex(clampSlideIndex(initial, slideCount));
    }
  }, [slideCount]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseSlideHash(window.location.hash);
      if (parsed !== null) {
        setIndex(clampSlideIndex(parsed, slideCount));
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [goTo, slideCount]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by browser policy; ignore.
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'Escape' && document.fullscreenElement) {
        void document.exitFullscreen();
        return;
      }

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        goTo(0);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        goTo(slideCount - 1);
        return;
      }

      if (NEXT_KEYS.has(event.key)) {
        event.preventDefault();
        goTo(nextSlideIndex(indexRef.current, slideCount));
        return;
      }

      if (PREV_KEYS.has(event.key)) {
        event.preventDefault();
        goTo(previousSlideIndex(indexRef.current, slideCount));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goTo, slideCount, toggleFullscreen]);

  const slide = lesson.slides[index];

  return (
    <div
      className="learn-presenter relative flex h-full min-h-0 flex-1 flex-col bg-background"
    >
      {learnTopics ? (
        <div
          className="absolute top-2 left-2 z-10 sm:hidden"
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={learnTopics.openTopics}
          >
            Topics
          </Button>
        </div>
      ) : null}

      <div
        className="relative min-h-0 flex-1 overflow-y-auto"
      >
        <div
          className="flex min-h-full w-full"
        >
          <div
            key={index}
            className={clsx(
              'm-auto flex w-full max-w-6xl min-h-full flex-col px-4 py-6 sm:px-8 sm:py-10',
              'max-sm:pb-[calc(var(--mobile-nav-offset,4.5rem)+4.75rem)]',
              !reduceMotion && 'motion-safe:animate-[learn-slide-in_0.2s_ease-out]',
            )}
          >
            {slide && (
              <LearnSlideContent
                slide={slide}
              />
            )}
          </div>
        </div>
      </div>

      <footer
        className={clsx(
          'flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border-color bg-background-light/90 px-3 py-3 backdrop-blur-sm sm:px-6',
          mobileStickyChromeZClassName,
          mobileFixedBottomChromeClassName,
          mobileFloatingPillInsetClassName,
          'max-sm:border-0 max-sm:bg-transparent max-sm:p-0 max-sm:backdrop-blur-none',
        )}
      >
        <div
          className={clsx(
            'relative flex w-full items-center px-3 py-2.5',
            mobileFloatingPillClassName,
            'sm:px-0',
          )}
        >
          <div
            className="flex flex-1 justify-start"
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={index <= 0}
              onClick={() => goTo(previousSlideIndex(index, slideCount))}
              icon={
                <ArrowLeftIcon
                  className="size-4 fill-current"
                />
              }
            >
              Previous
            </Button>
          </div>
          <p
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-(family-name:--font-geist-mono) tabular-nums text-foreground/75"
          >
            {index + 1}
            {' '}
            /
            {' '}
            {slideCount}
          </p>
          <div
            className="flex flex-1 justify-end"
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={index >= slideCount - 1}
              onClick={() => goTo(nextSlideIndex(index, slideCount))}
              iconRight={
                <ArrowRightIcon
                  className="size-4 fill-current"
                />
              }
            >
              Next
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
