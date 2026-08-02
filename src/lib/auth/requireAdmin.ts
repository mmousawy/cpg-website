import type { User } from '@supabase/supabase-js';

import { checkIsAdmin } from '@/lib/auth/checkIsAdmin';
import { createClient } from '@/utils/supabase/server';

export async function requireAdminUser(): Promise<
  { user: User } | { error: Response }
  > {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const isAdmin = await checkIsAdmin(supabase);

  if (!isAdmin) {
    return {
      error: new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return { user };
}

export async function requireAuthenticatedUser(): Promise<
  { user: User } | { error: Response }
  > {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return { user };
}
