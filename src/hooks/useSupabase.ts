'use client';

import { useContext } from 'react';
import { supabase } from '@/utils/supabase/client';
import { SupabaseContext } from '@/app/providers/SupabaseProvider';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';

/**
 * Hook that provides access to the Supabase client.
 * Prefers the context-provided client if available, otherwise falls back to the singleton instance.
 */
export function useSupabase(): SupabaseClient<Database> {
  const context = useContext(SupabaseContext);

  // Use context client if available, otherwise fall back to singleton
  return context?.client ?? supabase;
}
