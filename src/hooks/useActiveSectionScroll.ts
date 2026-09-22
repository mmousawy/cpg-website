'use client';

import { useEffect, useRef, useState } from 'react';

import { getScrollContainer, subscribeScrollContainer } from '@/utils/scrollContainer';

const MOBILE_PINNED_SHELL_MEDIA = '(max-width: 639px)';

/**
 * Tracks which section is currently in view.
 *
 * Uses a top-biased threshold (1/3 of viewport) so that clicking a sidebar
 * link — which scrolls the section to the top — correctly highlights the
 * target section. For sections near the bottom of the page that can never
 * scroll high enough, it falls back to the last section.
 *
 * Below 640px the document does not scroll; `#main-content` does. The
 * `mobile-pinned-shell` class is still present on desktop, so the container
 * is only treated as the scroller inside that media query.
 */
function getMobileScrollContainer(): HTMLElement | null {
  if (!window.matchMedia(MOBILE_PINNED_SHELL_MEDIA).matches) return null;
  return getScrollContainer();
}

function isNearScrollEnd(): boolean {
  const container = getMobileScrollContainer();
  if (container) {
    return container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
  }
  return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 100;
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
    return () => {
      unsubscribe();
      document.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [sectionKey]);

  return activeSectionId;
}
