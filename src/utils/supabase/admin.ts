import { createClient } from "@supabase/supabase-js";
import { Database } from '@/database.types';

// Admin client with service role key - use only in server-side code
export const createAdminClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
};
