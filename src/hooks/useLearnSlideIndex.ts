'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

import { clampSlideIndex, parseSlideHash } from '@/lib/learn/navigation';

/** Keeps slide index in sync with `#slide-N` on the current URL. */
export function useLearnSlideIndex(slideCount: number): number {
  const [index, setIndex] = useState(0);

  useLayoutEffect(() => {
    const initial = parseSlideHash(window.location.hash);
    if (initial !== null) {
      setIndex(clampSlideIndex(initial, slideCount));
    }
  }, [slideCount]);

  useEffect(() => {
    const sync = () => {
      const parsed = parseSlideHash(window.location.hash);
      if (parsed !== null) {
        setIndex(clampSlideIndex(parsed, slideCount));
      }
    };
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, [slideCount]);

  return index;
}
