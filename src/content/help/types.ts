import type { ReactNode } from 'react';

export type FAQItem = {
  id: string;
  title: string;
  content: ReactNode;
};

export type FAQSection = {
  id: string;
  title: string;
  items: FAQItem[];
};
