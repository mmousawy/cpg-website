import crypto from 'crypto';

import { createAdminClient } from '@/utils/supabase/admin';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashSignupBypassToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSignupBypassLink(options?: {
  ttlMs?: number;
}): Promise<{ token: string; bypassUrl: string; expiresAt: Date }> {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + (options?.ttlMs ?? DEFAULT_TTL_MS));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from('auth_tokens').insert({
    email: '',
    token_hash: hashSignupBypassToken(token),
    token_type: 'signup_bypass',
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw error;
  }

  return {
    token,
    bypassUrl: `${siteUrl}/signup?bypass=${token}`,
    expiresAt,
  };
}
