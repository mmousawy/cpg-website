import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient instance.
 *
 * Use this for:
 * - React components via QueryClientProvider
 * - Non-React code (sync handlers) for cache invalidation
 */
let queryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
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
    });
  }
  return queryClient;
}
