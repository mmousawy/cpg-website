'use client';

import { createClient } from "@/utils/supabase/client";
import { createContext } from "react";

export const SupabaseContext = createContext<{ client: ReturnType<typeof createClient> | null }>({ client: null });

export default function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseContext.Provider value={{ client: createClient() }}>
      {children}
    </SupabaseContext.Provider>
  );
}
