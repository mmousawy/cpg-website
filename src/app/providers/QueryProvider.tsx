'use client';

import { getQueryClient } from '@/lib/queryClient';
import { useSession } from '@/context/SessionContext';
import { hasSupabaseAuthCookie } from '@/utils/supabase/loadBrowserClient';
import { scheduleIdleWork } from '@/utils/scheduleIdle';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const { isLoggedIn } = useSession();

  useEffect(() => {
    if (!isLoggedIn && !hasSupabaseAuthCookie()) return;

    scheduleIdleWork(() => {
      void import('@/lib/sync').then((mod) => {
        mod.initializeSyncHandlers();
      });
    }, 2000);
  }, [isLoggedIn]);

  return (
    <QueryClientProvider
      client={queryClient}
    >
      {children}
    </QueryClientProvider>
  );
}
