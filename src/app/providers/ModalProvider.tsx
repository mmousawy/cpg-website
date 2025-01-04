'use client';

import { createContext, useState } from "react";

export const ModalContext = createContext({} as {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  title: string;
  setTitle: (title: string) => void;
  content: React.ReactNode;
  setContent: (content: React.ReactNode) => void;
});

export default function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("Modal Title");
  const [content, setContent] = useState<React.ReactNode>(<>Modal content</>);

  const defaultValues = {
    isOpen,
    setIsOpen,
    title,
    setTitle,
    content,
    setContent,
  };

  return (
    <ModalContext.Provider value={defaultValues}>
      {children}
    </ModalContext.Provider>
  );
}
