import { collectLinkHosts } from '@/lib/profileUrl/suspendedLinkHosts';
import { adminSupabase } from '@/utils/supabase/admin';
import type { Tables } from '@/database.types';

type ProfileRow = Pick<
  Tables<'profiles'>,
  'nickname' | 'full_name' | 'website' | 'bio' | 'social_links'
>;

type SignupSignalRow = Pick<
  Tables<'signup_signals'>,
  'ip_address' | 'user_agent' | 'accept_language'
>;

/**
 * Persist abuse signals before auth user deletion so repeat detection still works.
 * Table added in migration `20261106174500_account_deletion_automation.sql` (types after `pnpm db:sync`).
 */
export async function retainSuspendedFingerprintForProfileId(userId: string): Promise<void> {
  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('nickname, full_name, website, bio, social_links')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('retainSuspendedFingerprintForProfileId profile:', profileError);
    return;
  }

  const { data: signal, error: signalError } = await adminSupabase
    .from('signup_signals')
    .select('ip_address, user_agent, accept_language')
    .eq('profile_id', userId)
    .maybeSingle();

  if (signalError) {
    console.error('retainSuspendedFingerprintForProfileId signal:', signalError);
  }

  const p = profile as ProfileRow | null;
  const s = signal as SignupSignalRow | null;

  const socialLinks = Array.isArray(p?.social_links)
    ? (p!.social_links as { url?: string }[])
      .filter((l) => typeof l?.url === 'string')
      .map((l) => ({ url: l.url as string }))
    : [];

  const linkHosts = p
    ? collectLinkHosts({
      website: p.website,
      bio: p.bio,
      socialLinks,
    })
    : [];

  const { error: insertError } = await adminSupabase.from('suspended_deleted_fingerprints').insert({
    ip_address: s?.ip_address ?? null,
    user_agent: s?.user_agent ?? null,
    accept_language: s?.accept_language ?? null,
    nickname: p?.nickname ?? null,
    full_name: p?.full_name ?? null,
    link_hosts: linkHosts,
  });

  if (insertError) {
    console.error('retainSuspendedFingerprintForProfileId insert:', insertError);
  }
}
