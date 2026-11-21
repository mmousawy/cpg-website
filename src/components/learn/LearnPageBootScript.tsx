'use client';

import { useLayoutEffect } from 'react';

import { LEARN_PAGE_CLASS } from '@/utils/learnPath';

/** Keeps `learn-page` in sync on client navigations (head boot script handles first paint). */
export default function LearnPageBootScript() {
  useLayoutEffect(() => {
    document.documentElement.classList.add(LEARN_PAGE_CLASS);
    return () => {
      document.documentElement.classList.remove(LEARN_PAGE_CLASS);
    };
  }, []);

  return null;
}
