'use client';

import {
  getPhotoOverviewPath,
  subscribePhotoOverview,
} from '@/utils/photoOverviewNavigation';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type PhotoOverviewContextValue = {
  overviewPath: string | null;
};

const PhotoOverviewContext = createContext<PhotoOverviewContextValue>({
  overviewPath: null,
});

export function PhotoOverviewProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [overviewPath, setOverviewPath] = useState<string | null>(null);

  useEffect(() => {
    setOverviewPath(getPhotoOverviewPath());
    return subscribePhotoOverview(() => {
      setOverviewPath(getPhotoOverviewPath());
    });
  }, []);

  useEffect(() => {
    setOverviewPath(getPhotoOverviewPath());
  }, [pathname]);

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
