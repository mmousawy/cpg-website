import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';

/**
 * Clears inactivity deletion schedule for the current session (RPC); no-op if not scheduled as inactivity.
 */
export async function cancelInactivityScheduleIfNeeded(
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase.rpc('cancel_inactivity_deletion_schedule');
  if (error) {
    console.error('cancel_inactivity_deletion_schedule:', error);
  }
}
