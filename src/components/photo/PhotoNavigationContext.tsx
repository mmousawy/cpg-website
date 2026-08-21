'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type PhotoNavigationContextValue = {
  pendingShortId: string | null;
  setPendingShortId: (shortId: string | null) => void;
};

const PhotoNavigationContext = createContext<PhotoNavigationContextValue | null>(null);

export function PhotoNavigationProvider({ children }: { children: ReactNode }) {
  const [pendingShortId, setPendingShortId] = useState<string | null>(null);

  const value = useMemo(
    () => ({ pendingShortId, setPendingShortId }),
    [pendingShortId],
  );

  return (
    <PhotoNavigationContext.Provider value={value}>
      {children}
    </PhotoNavigationContext.Provider>
  );
}

export function usePhotoNavigation() {
  const context = useContext(PhotoNavigationContext);
  if (!context) {
    throw new Error('usePhotoNavigation must be used within PhotoNavigationProvider');
  }
  return context;
}
