import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import { supabaseClientGlobalOptions } from '@/utils/supabase/fetchWithFriendlyErrors';

// Singleton Supabase client instance
let supabaseClient: SupabaseClient<Database> | null = null;

function createClientInstance(): SupabaseClient<Database> {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      supabaseClientGlobalOptions,
    );
  }
  return supabaseClient;
}

// Export singleton instance directly
export const supabase = createClientInstance();

// Keep createClient() function for backward compatibility
export const createClient = () => supabase;
