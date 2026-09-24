'use client';

import { useEffect, useRef, useState } from 'react';

import { getScrollContainer, subscribeScrollContainer } from '@/utils/scrollContainer';

/**
 * Tracks which section is currently in view.
 *
 * Uses a top-biased threshold (1/3 of viewport) so that clicking a sidebar
 * link — which scrolls the section to the top — correctly highlights the
 * target section. For sections near the bottom of the page that can never
 * scroll high enough, it falls back to the last section once the user has
 * scrolled. At scroll position 0 a short document still uses the threshold,
 * including while a loading spinner is the only content.
 *
 * Below 640px the document does not scroll; `#main-content` does.
 */
function readScrollMetrics() {
  const container = getScrollContainer();
  if (container) {
    return {
      scrollTop: container.scrollTop,
      clientHeight: container.clientHeight,
      scrollHeight: container.scrollHeight,
    };
  }
  return {
    scrollTop: window.scrollY,
    clientHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
  };
}

function isNearScrollEnd(): boolean {
  const { scrollTop, clientHeight, scrollHeight } = readScrollMetrics();
  if (scrollTop <= 1) return false;
  return scrollTop + clientHeight >= scrollHeight - 100;
}

export function useActiveSectionScroll(sectionIds: string[]) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const sectionIdsRef = useRef(sectionIds);
  sectionIdsRef.current = sectionIds;
  const sectionKey = sectionIds.join(',');

  useEffect(() => {
    if (sectionIdsRef.current.length === 0) return;

    function update() {
      const ids = sectionIdsRef.current;
      if (ids.length === 0) return;

      if (isNearScrollEnd()) {
        setActiveSectionId(ids[ids.length - 1]);
        return;
      }

      const threshold = window.innerHeight / 3;
      let activeId: string | null = null;

      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= threshold) {
          activeId = id;
        }
      }

      setActiveSectionId(activeId ?? ids[0]);
    }

    update();
    const unsubscribe = subscribeScrollContainer(update);
    // Capture hears both the window (desktop) and `#main-content` (mobile).
    document.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('resize', update);
    // Account (and similar pages) mount the sidebar only after a loading
    // spinner. Re-measure when that content changes the document height.
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(document.body);
    const main = document.getElementById('main-content');
    if (main) resizeObserver.observe(main);
    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      document.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [sectionKey]);

  return activeSectionId;
}
