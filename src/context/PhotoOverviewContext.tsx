'use client';

import {
  getPhotoOverviewPath,
  subscribePhotoOverview,
} from '@/utils/photoOverviewNavigation';
import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

type PhotoOverviewContextValue = {
  overviewPath: string | null;
};

const PhotoOverviewContext = createContext<PhotoOverviewContextValue>({
  overviewPath: null,
});

export function PhotoOverviewProvider({ children }: { children: ReactNode }) {
  const overviewPath = useSyncExternalStore(
    subscribePhotoOverview,
    getPhotoOverviewPath,
    () => null,
  );

  return (
    <PhotoOverviewContext.Provider
      value={{ overviewPath }}
    >
      {children}
    </PhotoOverviewContext.Provider>
  );
}

export function usePhotoOverview() {
  return useContext(PhotoOverviewContext).overviewPath;
}
