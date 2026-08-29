import { createClient } from './server';
import type { User } from '@supabase/supabase-js';
import type { Tables } from '@/database.types';

import { asSupabaseUser, getUserFromClaims, type ServerUser } from '@/utils/supabase/claimsUser';

export type { ServerUser };

export type ServerProfile = Pick<Tables<'profiles'>, 'id' | 'email' | 'full_name' | 'nickname' | 'avatar_url' | 'terms_accepted_at'> & {
  is_admin: boolean  // is_admin can be null in DB but we default to false
}

export type ServerAuth = {
  user: User | null
  profile: ServerProfile | null
}

function isPrerenderAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const errorWithDigest = error as Error & { digest?: string };
  return (
    error.message.includes('Dynamic server usage')
    || error.message.includes('prerender')
    || error.message.includes('cookies() rejects')
    || errorWithDigest.digest === 'HANGING_PROMISE_REJECTION'
  );
}

/**
 * Verified session identity from JWT claims only (no /auth/v1/user).
 * Requires asymmetric JWT signing keys — run `node scripts/verify-jwt-signing.mjs`.
 */
export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const supabase = await createClient();
    return await getUserFromClaims(supabase);
  } catch (error) {
    if (isPrerenderAuthError(error)) {
      return null;
    }
    console.error('Error getting server user from claims:', error);
    return null;
  }
}

/**
 * Get auth data on the server.
 * Use this in server components to pass auth data to client components.
 */
export async function getServerAuth(): Promise<ServerAuth> {
  try {
    const supabase = await createClient();
    const claimsUser = await getUserFromClaims(supabase);

    if (!claimsUser) {
      return { user: null, profile: null };
    }

    const { data: profileData } = await supabase.rpc('get_own_profile');
    const profile = profileData as ServerProfile | null;

    return {
      user: asSupabaseUser(claimsUser),
      profile,
    };
  } catch (error) {
    // Silently fail during static generation/prerendering (no cookies available)
    if (isPrerenderAuthError(error)) {
      return { user: null, profile: null };
    }
    console.error('Error getting server auth:', error);
    return { user: null, profile: null };
  }
}
