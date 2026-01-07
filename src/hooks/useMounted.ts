import { useSyncExternalStore } from 'react';

/**
 * Hook that returns true after the component has mounted on the client.
 * Uses useSyncExternalStore to avoid hydration mismatches and comply with React Compiler.
 */

const emptySubscribe = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,  // Client: always mounted
    () => false, // Server: never mounted
  );
}
