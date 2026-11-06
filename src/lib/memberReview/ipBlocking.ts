import { expireTag } from '@/lib/cache/expireTag';
import { nicknameStemsMatch } from '@/lib/memberReview/nicknameStem';
import { isRecordableClientMeta, type RequestClientMeta } from '@/lib/memberReview/requestClientMeta';
import { collectLinkHosts } from '@/lib/profileUrl/suspendedLinkHosts';
import { adminSupabase } from '@/utils/supabase/admin';

export type SignupSignalSource = 'email_signup' | 'oauth_callback' | 'onboarding_complete';

const BLOCKED_IP_TAG = 'blocked-ips';

async function loadBlockedIpSet(): Promise<Set<string>> {
  const { data, error } = await adminSupabase.from('blocked_ips').select('ip_address');
  if (error) {
    console.error('loadBlockedIpSet:', error);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.ip_address).filter(Boolean));
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  const set = await loadBlockedIpSet();
  return set.has(ip);
}

export function expireBlockedIpCache(): void {
  expireTag(BLOCKED_IP_TAG);
}

export async function upsertSignupSignal(
  profileId: string,
  meta: RequestClientMeta,
  source: SignupSignalSource,
): Promise<void> {
  if (!isRecordableClientMeta(meta)) return;

  const now = new Date().toISOString();
  const { error } = await adminSupabase.from('signup_signals').upsert(
    {
      profile_id: profileId,
      ip_address: meta.ip,
      user_agent: meta.userAgent,
      accept_language: meta.acceptLanguage,
      source,
      updated_at: now,
    },
    { onConflict: 'profile_id' },
  );

  if (error) {
    console.error('upsertSignupSignal:', error);
  }
}

export async function blockClientIpsForProfile(
  profileId: string,
  reason: string | null,
): Promise<void> {
  const { data: signals, error: signalError } = await adminSupabase
    .from('signup_signals')
    .select('ip_address')
    .eq('profile_id', profileId);

  if (signalError) {
    console.error('blockClientIpsForProfile signals:', signalError);
    return;
  }

  const ips = [...new Set((signals ?? []).map((s) => s.ip_address).filter(Boolean))] as string[];
  if (ips.length === 0) return;

  const rows = ips.map((ip_address) => ({
    ip_address,
    profile_id: profileId,
    reason,
    blocked_at: new Date().toISOString(),
  }));

  const { error } = await adminSupabase.from('blocked_ips').upsert(rows, { onConflict: 'ip_address' });
  if (error) {
    console.error('blockClientIpsForProfile:', error);
    return;
  }
  expireBlockedIpCache();
}

export async function unblockClientIpsForProfile(profileId: string): Promise<void> {
  const { error } = await adminSupabase
    .from('blocked_ips')
    .delete()
    .eq('profile_id', profileId);

  if (error) {
    console.error('unblockClientIpsForProfile:', error);
    return;
  }
  expireBlockedIpCache();
}

type SuspendedSnapshot = {
  nickname: string | null;
  full_name: string | null;
  website: string | null;
  bio: string | null;
  social_links: unknown;
  signalIp: string | null;
  retainedLinkHosts?: string[] | null;
};

async function loadRetainedSuspendedSnapshots(): Promise<SuspendedSnapshot[]> {
  const { data, error } = await (adminSupabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => Promise<{
        data: Array<{
          ip_address: string | null;
          nickname: string | null;
          full_name: string | null;
          link_hosts: string[] | null;
        }> | null;
        error: { message: string } | null;
      }>;
    };
  }).from('suspended_deleted_fingerprints').select('ip_address, nickname, full_name, link_hosts');

  if (error) {
    console.error('loadRetainedSuspendedSnapshots:', error);
    return [];
  }
  if (!data?.length) {
    return [];
  }

  return data.map((row) => ({
    nickname: row.nickname,
    full_name: row.full_name,
    website: null,
    bio: null,
    social_links: null,
    signalIp: row.ip_address,
    retainedLinkHosts: row.link_hosts,
  }));
}

async function loadSuspendedSnapshots(): Promise<SuspendedSnapshot[]> {
  const { data: profiles, error } = await adminSupabase
    .from('profiles')
    .select('id, nickname, full_name, website, bio, social_links')
    .not('suspended_at', 'is', null);

  if (error || !profiles?.length) {
    if (error) console.error('loadSuspendedSnapshots:', error);
    return [];
  }

  const ids = profiles.map((p) => p.id);
  const { data: signals } = await adminSupabase
    .from('signup_signals')
    .select('profile_id, ip_address')
    .in('profile_id', ids);

  const ipByProfile = new Map<string, string>();
  for (const row of signals ?? []) {
    if (row.ip_address) ipByProfile.set(row.profile_id, row.ip_address);
  }

  const active = profiles.map((p) => ({
    nickname: p.nickname,
    full_name: p.full_name,
    website: p.website,
    bio: p.bio,
    social_links: p.social_links,
    signalIp: ipByProfile.get(p.id) ?? null,
  }));

  const retained = await loadRetainedSuspendedSnapshots();
  return [...active, ...retained];
}

function normalizeName(name: string | null | undefined): string | null {
  const n = name?.trim().toLowerCase();
  return n ? n : null;
}

function hostsFromSnapshot(row: SuspendedSnapshot): string[] {
  if (row.retainedLinkHosts && row.retainedLinkHosts.length > 0) {
    return [...row.retainedLinkHosts];
  }
  const socialLinks = Array.isArray(row.social_links)
    ? (row.social_links as { url?: string }[])
      .filter((l) => typeof l?.url === 'string')
      .map((l) => ({ url: l.url as string }))
    : [];
  return collectLinkHosts({
    website: row.website,
    bio: row.bio,
    socialLinks,
  });
}

/** True when this finish overlaps a suspended member (IP, nickname stem, name, or link host). */
export async function matchesSuspendedRepeat(input: {
  nickname: string;
  fullName: string | null;
  website: string | null;
  bio: string | null;
  socialLinks: { url: string }[];
  clientIp: string | null;
}): Promise<boolean> {
  if (input.clientIp && await isIpBlocked(input.clientIp)) {
    return true;
  }

  const inputHosts = new Set(collectLinkHosts(input));
  const inputName = normalizeName(input.fullName);
  const suspended = await loadSuspendedSnapshots();

  for (const row of suspended) {
    if (row.signalIp && input.clientIp && row.signalIp === input.clientIp) {
      return true;
    }

    if (row.nickname && nicknameStemsMatch(input.nickname, row.nickname)) {
      return true;
    }

    const suspendedName = normalizeName(row.full_name);
    if (inputName && suspendedName && inputName === suspendedName) {
      return true;
    }

    for (const host of hostsFromSnapshot(row)) {
      if (inputHosts.has(host)) return true;
    }
  }

  return false;
}
