'use client';

import {
  triggerNavigationProgress,
  triggerNavigationProgressComplete,
} from '@/lib/navigationProgressEvents';
import {
  confirmLeaveWithUnsavedChanges,
  unsavedChangesLeaveMessage,
} from '@/utils/confirmHelpers';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChangesState] = useState(false);

  // Use ref for synchronous checks in event handlers
  const hasUnsavedChangesRef = useRef(false);

  const setHasUnsavedChanges = useCallback((value: boolean) => {
    hasUnsavedChangesRef.current = value;
    setHasUnsavedChangesState(value);
  }, []);

  // Expose setter on window for useFormChanges hook
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__unsavedChangesContext = {
        setHasUnsavedChanges,
        hasUnsavedChanges: () => hasUnsavedChangesRef.current,
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__unsavedChangesContext;
      }
    };
  }, [setHasUnsavedChanges]);

  // Handle browser close/refresh (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        e.returnValue = unsavedChangesLeaveMessage;
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Browser back/forward while dirty
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const pushHistoryTrap = () => {
      window.history.pushState(null, '', window.location.href);
    };

    pushHistoryTrap();

    const handlePopState = () => {
      if (!hasUnsavedChangesRef.current) return;

      if (!confirmLeaveWithUnsavedChanges()) {
        pushHistoryTrap();
        return;
      }

      hasUnsavedChangesRef.current = false;
      setHasUnsavedChangesState(false);
      window.history.back();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsavedChanges]);

  // In-app link clicks: native confirm, then let Next.js handle navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!hasUnsavedChangesRef.current) return;

      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      if (
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.getAttribute('target') === '_blank' ||
        anchor.getAttribute('download') !== null
      ) {
        return;
      }

      if (!confirmLeaveWithUnsavedChanges()) {
        e.preventDefault();
        e.stopPropagation();
        triggerNavigationProgressComplete();
        return;
      }

      hasUnsavedChangesRef.current = false;
      setHasUnsavedChangesState(false);
      triggerNavigationProgress();
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return (
    <UnsavedChangesContext.Provider
      value={{ hasUnsavedChanges, setHasUnsavedChanges }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider');
  }
  return context;
}

/** For Next.js `<Link onNavigate>` — same native confirm as document click interception. */
export function useUnsavedChangesOnNavigate() {
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges();

  return useCallback(
    (e: { preventDefault: () => void }) => {
      if (!hasUnsavedChanges) return;
      if (!confirmLeaveWithUnsavedChanges()) {
        e.preventDefault();
        triggerNavigationProgressComplete();
        return;
      }
      setHasUnsavedChanges(false);
      triggerNavigationProgress();
    },
    [hasUnsavedChanges, setHasUnsavedChanges],
  );
}
