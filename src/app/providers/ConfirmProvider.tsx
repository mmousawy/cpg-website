'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';

import { subscribeRouteChange } from '@/lib/routeChange';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Optional content to display between message and buttons (e.g., list of items) */
  content?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}

export function useConfirmState() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirmState must be used within a ConfirmProvider');
  }
  return {
    isOpen: context.isOpen,
    options: context.options,
    resolve: context.resolve,
  };
}

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const pendingResolveRef = useRef<((value: boolean) => void) | null>(null);

  useLayoutEffect(() => {
    return subscribeRouteChange(() => {
      if (pendingResolveRef.current) {
        pendingResolveRef.current(false);
        pendingResolveRef.current = null;
      }
      setIsOpen(false);
      setOptions(null);
    });
  }, []);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      pendingResolveRef.current = resolve;
      setOptions(opts);
      setIsOpen(true);
    });
  }, []);

  const handleResolve = useCallback((value: boolean) => {
    const resolve = pendingResolveRef.current;
    pendingResolveRef.current = null;
    if (resolve) {
      resolve(value);
    }
    setIsOpen(false);
    // Clear state after animation
    setTimeout(() => {
      setOptions(null);
    }, 300);
  }, []);

  return (
    <ConfirmContext.Provider
      value={{
        confirm,
        isOpen,
        options,
        resolve: handleResolve,
      }}
    >
      {children}
    </ConfirmContext.Provider>
  );
}
