'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useActiveSectionScroll } from '@/hooks/useActiveSectionScroll';
import { subscribeScrollContainer } from '@/utils/scrollContainer';

interface SectionScrollContextType {
  activeSectionId: string | null;
  pinSection: (id: string) => void;
}

const SectionScrollContext = createContext<SectionScrollContextType | null>(null);

interface SectionScrollProviderProps {
  sectionIds: string[];
  children: React.ReactNode;
}

export function SectionScrollProvider({ sectionIds, children }: SectionScrollProviderProps) {
  const observedActive = useActiveSectionScroll(sectionIds);
  const [pinnedSectionId, setPinnedSectionId] = useState<string | null>(null);
  const ignoreScrollUntilRef = useRef<number>(0);
  const pinCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    pinCleanupRef.current?.();
  }, []);

  const pinSection = useCallback((id: string) => {
    setPinnedSectionId(id);
    // Ignore scroll events during the programmatic scroll animation
    ignoreScrollUntilRef.current = Date.now() + 800;
    pinCleanupRef.current?.();

    let unsubscribe: (() => void) | null = null;
    const handleUserScroll = () => {
      if (Date.now() < ignoreScrollUntilRef.current) return;
      setPinnedSectionId(null);
      pinCleanupRef.current?.();
      pinCleanupRef.current = null;
    };
    const timeoutId = window.setTimeout(() => {
      unsubscribe = subscribeScrollContainer(handleUserScroll);
      document.addEventListener('scroll', handleUserScroll, { passive: true, capture: true });
    }, 100);

    pinCleanupRef.current = () => {
      window.clearTimeout(timeoutId);
      unsubscribe?.();
      unsubscribe = null;
      document.removeEventListener('scroll', handleUserScroll, { capture: true });
    };
  }, []);

  const activeSectionId = pinnedSectionId ?? observedActive;

  return (
    <SectionScrollContext.Provider
      value={{ activeSectionId, pinSection }}
    >
      {children}
    </SectionScrollContext.Provider>
  );
}

export function useSectionScroll() {
  const context = useContext(SectionScrollContext);
  if (!context) {
    throw new Error('useSectionScroll must be used within SectionScrollProvider');
  }
  return context;
}
