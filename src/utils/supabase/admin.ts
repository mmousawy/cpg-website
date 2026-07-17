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

// Export singleton instance on first use (not at import time — avoids build failures
// when env vars are unavailable during `next build` static analysis).
export const createAdminClient = () => createAdminClientInstance();

export const adminSupabase: SupabaseClient<Database> = new Proxy(
  {} as SupabaseClient<Database>,
  {
    get(_target, prop) {
      const client = createAdminClientInstance();
      const value = Reflect.get(client, prop, client);
      return typeof value === 'function' ? value.bind(client) : value;
    },
  },
);
