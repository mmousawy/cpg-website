'use client';

import { createContext, useState } from "react";

export type ModalSize = 'default' | 'large' | 'fullscreen';

export const ModalContext = createContext({} as {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  title: string;
  setTitle: (title: string) => void;
  content: React.ReactNode;
  setContent: (content: React.ReactNode) => void;
  size: ModalSize;
  setSize: (size: ModalSize) => void;
});

export default function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("Modal Title");
  const [content, setContent] = useState<React.ReactNode>(<>Modal content</>);
  const [size, setSize] = useState<ModalSize>('default');

  // Reset size when modal closes, but delay until after animation
  const handleSetIsOpen = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Wait for close animation (300ms) before resetting size
      setTimeout(() => {
        setSize('default');
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
    size,
    setSize,
  };

  return (
    <ModalContext.Provider value={defaultValues}>
      {children}
    </ModalContext.Provider>
  );
}
