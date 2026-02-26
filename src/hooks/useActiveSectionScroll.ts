'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks which section is currently in view.
 *
 * Uses a top-biased threshold (1/3 of viewport) so that clicking a sidebar
 * link — which scrolls the section to the top — correctly highlights the
 * target section. For sections near the bottom of the page that can never
 * scroll high enough, it falls back to the lowest section visible in the
 * top 2/3 of the viewport.
 */
export function useActiveSectionScroll(sectionIds: string[]) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const sectionKey = sectionIds.join(',');

  useEffect(() => {
    if (sectionIds.length === 0) return;

    function update() {
      const atBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 100;

      if (atBottom) {
        setActiveSectionId(sectionIds[sectionIds.length - 1]);
        return;
      }

      const threshold = window.innerHeight / 3;
      let activeId: string | null = null;

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= threshold) {
          activeId = id;
        }
      }

      setActiveSectionId(activeId ?? sectionIds[0]);
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [sectionKey, sectionIds]);

  return activeSectionId;
}
