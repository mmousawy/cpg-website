import { createClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton admin client instance
let adminClient: SupabaseClient<Database> | null = null;

function createAdminClientInstance(): SupabaseClient<Database> {
  if (!adminClient) {
    adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return adminClient;
}

// Export singleton instance directly
export const adminSupabase = createAdminClientInstance();

// Keep createAdminClient() function for backward compatibility
// Admin client with service role key - use only in server-side code
export const createAdminClient = () => adminSupabase;
