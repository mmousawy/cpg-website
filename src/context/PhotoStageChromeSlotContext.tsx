'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type PhotoStageChromeSlotValue = {
  fallbackHref: string;
  fallbackLabel: string;
  idleRevealRouteKey?: string;
};

const PhotoStageChromeSlotContext = createContext<PhotoStageChromeSlotValue | null>(null);

export function PhotoStageChromeSlotProvider({
  value,
  children,
}: {
  value: PhotoStageChromeSlotValue;
  children: ReactNode;
}) {
  return (
    <PhotoStageChromeSlotContext.Provider
      value={value}
    >
      {children}
    </PhotoStageChromeSlotContext.Provider>
  );
}

export function usePhotoStageChromeSlot() {
  return useContext(PhotoStageChromeSlotContext);
}
