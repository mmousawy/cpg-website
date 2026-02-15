'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useActiveHelpSection } from '@/hooks/useActiveHelpSection';

const SCROLL_END_DELAY_MS = 600;

interface HelpScrollContextType {
  activeSectionId: string | null;
  pinSection: (id: string) => void;
}

const HelpScrollContext = createContext<HelpScrollContextType | null>(null);

interface HelpScrollProviderProps {
  sectionIds: string[];
  children: React.ReactNode;
}

export function HelpScrollProvider({ sectionIds, children }: HelpScrollProviderProps) {
  const observedActive = useActiveHelpSection(sectionIds);
  const [pinnedSectionId, setPinnedSectionId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pinSection = useCallback((id: string) => {
    setPinnedSectionId(id);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const clearPin = () => {
      setPinnedSectionId(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    // Use scrollend when supported, with fallback timeout
    const handleScrollEnd = () => {
      clearPin();
    };

    if ('onscrollend' in document) {
      document.addEventListener('scrollend', handleScrollEnd, { once: true });
    }

    // Fallback: clear after typical smooth-scroll duration
    timeoutRef.current = setTimeout(clearPin, SCROLL_END_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const activeSectionId = pinnedSectionId ?? observedActive;

  return (
    <HelpScrollContext.Provider
      value={{ activeSectionId, pinSection }}
    >
      {children}
    </HelpScrollContext.Provider>
  );
}

export function useHelpScroll() {
  const context = useContext(HelpScrollContext);
  if (!context) {
    throw new Error('useHelpScroll must be used within HelpScrollProvider');
  }
  return context;
}
