'use client';

import { createContext, useCallback, useRef, useState } from 'react';

export type ModalSize = 'small' | 'default' | 'medium' | 'large' | 'fullscreen';

export type BeforeCloseCheck = () => boolean | Promise<boolean>;

export const ModalContext = createContext({} as {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  requestClose: () => Promise<void>;
  setBeforeCloseCheck: (fn: BeforeCloseCheck | null) => void;
  title: string;
  setTitle: (title: string) => void;
  content: React.ReactNode;
  setContent: (content: React.ReactNode) => void;
  footer: React.ReactNode;
  setFooter: (footer: React.ReactNode) => void;
  size: ModalSize;
  setSize: (size: ModalSize) => void;
  flushContentTop: boolean;
  setFlushContentTop: (flush: boolean) => void;
});

export default function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('Modal Title');
  const [content, setContent] = useState<React.ReactNode>(<>
    Modal content
  </>);
  const [footer, setFooter] = useState<React.ReactNode>(null);
  const [size, setSize] = useState<ModalSize>('default');
  const [flushContentTop, setFlushContentTop] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beforeCloseCheckRef = useRef<BeforeCloseCheck | null>(null);

  const setBeforeCloseCheck = useCallback((fn: BeforeCloseCheck | null) => {
    beforeCloseCheckRef.current = fn;
  }, []);

  const handleSetIsOpen = useCallback((open: boolean) => {
    if (!open) beforeCloseCheckRef.current = null;
    setIsOpen(open);
    if (open) {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    } else {
      resetTimeoutRef.current = setTimeout(() => {
        setSize('default');
        setFooter(null);
        setFlushContentTop(false);
        resetTimeoutRef.current = null;
      }, 350);
    }
  }, []);

  const requestClose = useCallback(async () => {
    const check = beforeCloseCheckRef.current;
    if (check) {
      const ok = await Promise.resolve(check());
      if (!ok) return;
    }
    handleSetIsOpen(false);
  }, [handleSetIsOpen]);

  const defaultValues = {
    isOpen,
    setIsOpen: handleSetIsOpen,
    requestClose,
    setBeforeCloseCheck,
    title,
    setTitle,
    content,
    setContent,
    footer,
    setFooter,
    size,
    setSize,
    flushContentTop,
    setFlushContentTop,
  };

  return (
    <ModalContext.Provider
      value={defaultValues}
    >
      {children}
    </ModalContext.Provider>
  );
}
