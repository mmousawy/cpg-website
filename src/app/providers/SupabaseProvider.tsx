'use client';

import { supabase } from "@/utils/supabase/client";
import { createContext } from "react";
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';

export const SupabaseContext = createContext<{ client: SupabaseClient<Database> | null }>({ client: null });

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseContext.Provider value={{ client: supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
}
