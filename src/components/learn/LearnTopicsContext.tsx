'use client';

import { createContext, useContext } from 'react';

type LearnTopicsContextValue = {
  openTopics: () => void;
};

export const LearnTopicsContext = createContext<LearnTopicsContextValue | null>(null);

export function useLearnTopics() {
  return useContext(LearnTopicsContext);
}
