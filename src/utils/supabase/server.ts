import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { Database } from '@/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with cookie access (for authenticated requests).
 * Using this makes the page DYNAMIC (server-rendered on each request).
 * Use for: protected routes, user-specific data, mutations.
 */
export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};

// Singleton public client instance (no cookies needed)
let publicClient: SupabaseClient<Database> | null = null;

function createPublicClientInstance(): SupabaseClient<Database> {
  if (!publicClient) {
    publicClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return publicClient;
}

/**
 * Creates a Supabase client WITHOUT cookie access (for public data only).
 * Using this allows the page to be STATIC (pre-rendered or cached).
 * Use for: public pages fetching public data (homepage, galleries, events, profiles).
 * Returns a singleton instance.
 */
export const createPublicClient = () => createPublicClientInstance();
