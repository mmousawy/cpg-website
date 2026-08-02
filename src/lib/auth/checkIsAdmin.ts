import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';

type AppSupabase = SupabaseClient<Database>;

/** Uses SECURITY DEFINER RPC — safe after profiles column grants are restricted. */
export async function checkIsAdmin(supabase: AppSupabase): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}
