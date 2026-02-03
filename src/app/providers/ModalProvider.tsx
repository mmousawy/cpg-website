'use client';

import { createContext, useRef, useState } from 'react';

export type ModalSize = 'small' | 'default' | 'medium' | 'large' | 'fullscreen';

export const ModalContext = createContext({} as {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  title: string;
  setTitle: (title: string) => void;
  content: React.ReactNode;
  setContent: (content: React.ReactNode) => void;
  footer: React.ReactNode;
  setFooter: (footer: React.ReactNode) => void;
  size: ModalSize;
  setSize: (size: ModalSize) => void;
});

export default function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('Modal Title');
  const [content, setContent] = useState<React.ReactNode>(<>
    Modal content
  </>);
  const [footer, setFooter] = useState<React.ReactNode>(null);
  const [size, setSize] = useState<ModalSize>('default');
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset size and footer when modal closes, but delay until after animation
  const handleSetIsOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Cancel any pending reset when reopening
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    } else {
      // Wait for close animation (300ms) before resetting
      resetTimeoutRef.current = setTimeout(() => {
        setSize('default');
        setFooter(null);
        resetTimeoutRef.current = null;
      }, 350);
    }
  };

  const defaultValues = {
    isOpen,
    setIsOpen: handleSetIsOpen,
    title,
    setTitle,
    content,
    setContent,
    footer,
    setFooter,
    size,
    setSize,
  };

  return (
    <ModalContext.Provider
      value={defaultValues}
    >
      {children}
    </ModalContext.Provider>
  );
}
