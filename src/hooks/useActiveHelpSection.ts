'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks which help section is currently in view by finding the section
 * that "owns" the vertical center of the viewport on every scroll frame.
 */
export function useActiveHelpSection(sectionIds: string[]) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const sectionKey = sectionIds.join(',');

  useEffect(() => {
    if (sectionIds.length === 0) return;

    function update() {
      const atTop = window.scrollY < 300;
      const atBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 100;

      if (atTop) {
        setActiveSectionId(sectionIds[0]);
        return;
      }

      if (atBottom) {
        setActiveSectionId(sectionIds[sectionIds.length - 1]);
        return;
      }

      const center = window.innerHeight / 2;
      let activeId: string | null = null;

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= center) {
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
