'use client';

import { getQueryClient } from '@/lib/queryClient';
import { initializeSyncHandlers } from '@/lib/sync';
import { scheduleIdleWork } from '@/utils/scheduleIdle';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Use singleton QueryClient so it's accessible from non-React code
  const queryClient = getQueryClient();

  // Initialize sync handlers after first paint
  useEffect(() => {
    scheduleIdleWork(() => {
      initializeSyncHandlers();
    }, 2000);
  }, []);

  return (
    <QueryClientProvider
      client={queryClient}
    >
      {children}
    </QueryClientProvider>
  );
}
