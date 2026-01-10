'use client';

import { createClient } from '@/utils/supabase/client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ManageContextType {
  photoCount: number;
  albumCount: number;
  refreshCounts: () => Promise<void>;
  isLoadingCounts: boolean;
}

const ManageContext = createContext<ManageContextType>({
  photoCount: 0,
  albumCount: 0,
  refreshCounts: async () => {},
  isLoadingCounts: true,
});

export function ManageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const supabase = createClient();
  const [photoCount, setPhotoCount] = useState(0);
  const [albumCount, setAlbumCount] = useState(0);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  const refreshCounts = useCallback(async () => {
    if (!user) return;

    try {
      const [photosResult, albumsResult] = await Promise.all([
        supabase
          .from('photos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('deleted_at', null),
        supabase
          .from('albums')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('deleted_at', null),
      ]);

      setPhotoCount(photosResult.count ?? 0);
      setAlbumCount(albumsResult.count ?? 0);
    } catch (err) {
      console.error('Error fetching counts:', err);
    } finally {
      setIsLoadingCounts(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user) {
      refreshCounts();
    }
  }, [user, refreshCounts]);

  return (
    <ManageContext.Provider
      value={{
        photoCount,
        albumCount,
        refreshCounts,
        isLoadingCounts,
      }}
    >
      {children}
    </ManageContext.Provider>
  );
}

export function useManage() {
  return useContext(ManageContext);
}

