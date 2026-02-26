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

  const pinSection = useCallback((id: string) => {
    setPinnedSectionId(id);
    // Ignore scroll events during the programmatic scroll animation
    ignoreScrollUntilRef.current = Date.now() + 800;

    // After the scroll settles, clear the pin on the next user-initiated scroll
    const handleUserScroll = () => {
      if (Date.now() < ignoreScrollUntilRef.current) return;
      setPinnedSectionId(null);
      window.removeEventListener('scroll', handleUserScroll);
    };

    // Defer attaching so the current click's scroll doesn't immediately clear
    setTimeout(() => {
      window.addEventListener('scroll', handleUserScroll, { passive: true });
    }, 100);
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
