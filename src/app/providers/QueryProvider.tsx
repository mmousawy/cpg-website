'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes - cache persists for 10 minutes
            refetchOnWindowFocus: false, // Don't refetch when window regains focus
            retry: 1, // Retry failed requests once
          },
          mutations: {
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider
    client={queryClient}
  >
    {children}
  </QueryClientProvider>;
}
