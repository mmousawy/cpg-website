import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';

/** Minimal user identity from verified JWT claims (no /auth/v1/user round trip). */
export type ServerUser = Pick<User, 'id' | 'email'>;

export async function getUserFromClaims(
  supabase: SupabaseClient<Database>,
): Promise<ServerUser | null> {
  const { data: claimsData, error } = await supabase.auth.getClaims();

  if (error || !claimsData?.claims) {
    return null;
  }

  const claims = claimsData.claims;
  if (typeof claims.sub !== 'string') {
    return null;
  }

  return {
    id: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : undefined,
  };
}

/** Cast for APIs that still expect Supabase User (only id/email are populated). */
export function asSupabaseUser(user: ServerUser): User {
  return user as User;
}
