'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

type PhotoLightboxOpenContextValue = {
  register: (open: (() => void) | null) => void;
  open: () => void;
};

const PhotoLightboxOpenContext = createContext<PhotoLightboxOpenContextValue | null>(null);

export function PhotoLightboxOpenProvider({ children }: { children: ReactNode }) {
  const openRef = useRef<(() => void) | null>(null);

  const register = useCallback((open: (() => void) | null) => {
    openRef.current = open;
  }, []);

  const open = useCallback(() => {
    openRef.current?.();
  }, []);

  const value = useMemo(() => ({ register, open }), [register, open]);

  return (
    <PhotoLightboxOpenContext.Provider
      value={value}
    >
      {children}
    </PhotoLightboxOpenContext.Provider>
  );
}

export function usePhotoLightboxOpen() {
  return useContext(PhotoLightboxOpenContext);
}
