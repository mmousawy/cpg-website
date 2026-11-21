'use client';

import { createContext, useContext } from 'react';

type LearnTopicsContextValue = {
  /** Opens the mobile outline sheet (pages when in a lesson, otherwise topics). */
  openMenu: () => void;
};

export const LearnTopicsContext = createContext<LearnTopicsContextValue | null>(null);

export function useLearnTopics() {
  return useContext(LearnTopicsContext);
}
