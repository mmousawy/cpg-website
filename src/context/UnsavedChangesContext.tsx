'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChangesState] = useState(false);
  const router = useRouter();
  const confirm = useConfirm();

  // Use ref for synchronous checks in event handlers
  const hasUnsavedChangesRef = useRef(false);

  const setHasUnsavedChanges = useCallback((value: boolean) => {
    hasUnsavedChangesRef.current = value;
    setHasUnsavedChangesState(value);
  }, []);

  // Expose setter on window for useFormChanges hook
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__unsavedChangesContext = { setHasUnsavedChanges };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__unsavedChangesContext;
      }
    };
  }, [setHasUnsavedChanges]);

  // Handle browser close/refresh (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Intercept link clicks
  useEffect(() => {
    const handleClick = async (e: MouseEvent) => {
      // Skip if no unsaved changes
      if (!hasUnsavedChangesRef.current) return;

      // Find anchor element
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Skip external/special links
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

      // Block navigation and show confirmation
      e.preventDefault();
      e.stopPropagation();

      const confirmed = await confirm({
        title: 'Unsaved changes',
        message: 'You have unsaved changes that will be lost. Are you sure you want to leave?',
        confirmLabel: 'Leave',
        variant: 'danger',
      });

      if (confirmed) {
        // Clear state before navigation
        hasUnsavedChangesRef.current = false;
        setHasUnsavedChangesState(false);

        // Use router.push directly - programmatic anchor.click() is ignored by Next.js
        await router.push(href);
      }
    };

    // Capture phase to intercept before Next.js
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [confirm, router]);

  return (
    <UnsavedChangesContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges }}>
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
