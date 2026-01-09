'use client';

import { createContext, useCallback, useContext, useState } from 'react';

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
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setResolveRef(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleResolve = useCallback((value: boolean) => {
    if (resolveRef) {
      resolveRef(value);
    }
    setIsOpen(false);
    // Clear state after animation
    setTimeout(() => {
      setOptions(null);
      setResolveRef(null);
    }, 300);
  }, [resolveRef]);

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
