'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (value: boolean) => void
  confirmNavigation: (href: string) => void
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Expose setter on window for useFormChanges hook to access
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

  // Handle browser beforeunload (refresh, close tab, external navigation)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle browser back/forward buttons (popstate)
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // Push a dummy state so we can intercept back navigation
    const currentPath = window.location.pathname + window.location.search;
    window.history.pushState({ unsavedChangesGuard: true }, '', currentPath);

    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges) {
        // Re-push the state to prevent navigation
        window.history.pushState({ unsavedChangesGuard: true }, '', currentPath);
        // Show our dialog
        setPendingNavigation('__back__');
        setShowDialog(true);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Clean up the dummy state when unmounting or when changes are saved
      if (window.history.state?.unsavedChangesGuard) {
        window.history.back();
      }
    };
  }, [hasUnsavedChanges]);

  // Intercept internal link clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!hasUnsavedChanges) return;

      // Find the closest anchor tag
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Skip external links, hash links, and non-navigation links
      if (
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target.getAttribute('target') === '_blank' ||
        target.getAttribute('download') !== null
      ) {
        return;
      }

      // Prevent navigation and show confirmation
      e.preventDefault();
      e.stopPropagation();
      setPendingNavigation(href);
      setShowDialog(true);
    };

    // Use capture phase to intercept before Next.js handles it
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [hasUnsavedChanges]);

  // Show/hide dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (showDialog && dialog && !dialog.open) {
      dialog.showModal();
    } else if (!showDialog && dialog && dialog.open) {
      dialog.close();
    }
  }, [showDialog]);

  const handleConfirm = useCallback(() => {
    setShowDialog(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      if (pendingNavigation === '__back__') {
        // Go back twice: once for our guard state, once for the actual back
        window.history.go(-2);
      } else {
        router.push(pendingNavigation);
      }
      setPendingNavigation(null);
    }
  }, [pendingNavigation, router]);

  const handleCancel = useCallback(() => {
    setShowDialog(false);
    setPendingNavigation(null);
  }, []);

  const confirmNavigation = useCallback((href: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(href);
      setShowDialog(true);
    } else {
      router.push(href);
    }
  }, [hasUnsavedChanges, router]);

  return (
    <UnsavedChangesContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges, confirmNavigation }}>
      {children}

      {/* Confirmation Dialog - always rendered, visibility controlled by showModal/close */}
      <dialog
        ref={dialogRef}
        className="fixed inset-0 z-50 m-auto max-w-md rounded-xl border border-border-color bg-background p-0 shadow-2xl backdrop:bg-black/50"
        onClose={handleCancel}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Unsaved changes
          </h2>
          <p className="text-foreground/70 mb-6">
            You have unsaved changes that will be lost if you leave this page. Are you sure you want to continue?
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg border border-border-color bg-background text-sm font-medium hover:bg-background-light transition-colors"
            >
              Stay on page
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Leave page
            </button>
          </div>
        </div>
      </dialog>
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
