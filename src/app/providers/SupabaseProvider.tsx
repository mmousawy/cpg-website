'use client';

import { createContext, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import { loadBrowserSupabase, shouldLoadBrowserSupabase } from '@/utils/supabase/loadBrowserClient';

export const SupabaseContext = createContext<{ client: SupabaseClient<Database> | null }>({ client: null });

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<SupabaseClient<Database> | null>(null);

  useEffect(() => {
    if (!shouldLoadBrowserSupabase()) return;
    let cancelled = false;
    void loadBrowserSupabase().then((nextClient) => {
      if (!cancelled) setClient(nextClient);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SupabaseContext.Provider
      value={{ client }}
    >
      {children}
    </SupabaseContext.Provider>
  );
}
