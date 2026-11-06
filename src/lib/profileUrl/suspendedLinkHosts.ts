import { extractUrlsFromText } from '@/lib/profileUrl/checkProfileUrl';
import { adminSupabase } from '@/utils/supabase/admin';

export function hostFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function collectLinkHosts(input: {
  website: string | null;
  bio: string | null;
  socialLinks: { url: string }[];
}): string[] {
  const hosts = new Set<string>();
  const website = input.website?.trim();
  if (website) {
    const host = hostFromUrl(website);
    if (host) hosts.add(host);
  }
  for (const link of input.socialLinks) {
    const host = hostFromUrl(link.url);
    if (host) hosts.add(host);
  }
  for (const url of extractUrlsFromText(input.bio ?? '')) {
    const host = hostFromUrl(url);
    if (host) hosts.add(host);
  }
  return [...hosts];
}

/** Hosts from website, social links, and bio URLs on suspended profiles. */
export async function getSuspendedProfileLinkHosts(): Promise<Set<string>> {
  const { data, error } = await adminSupabase
    .from('profiles')
    .select('website, bio, social_links')
    .not('suspended_at', 'is', null);

  if (error) {
    console.error('getSuspendedProfileLinkHosts:', error);
    return new Set();
  }

  const hosts = new Set<string>();
  for (const row of data ?? []) {
    const socialLinks = Array.isArray(row.social_links)
      ? (row.social_links as { url?: string }[])
        .filter((l) => typeof l?.url === 'string')
        .map((l) => ({ url: l.url as string }))
      : [];
    for (const host of collectLinkHosts({
      website: row.website,
      bio: row.bio,
      socialLinks,
    })) {
      hosts.add(host);
    }
  }

  const { data: retained, error: retainedError } = await (adminSupabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => Promise<{
        data: Array<{ link_hosts: string[] | null }> | null;
        error: { message: string } | null;
      }>;
    };
  }).from('suspended_deleted_fingerprints').select('link_hosts');

  if (retainedError) {
    console.error('getSuspendedProfileLinkHosts retained:', retainedError);
  } else {
    for (const row of retained ?? []) {
      for (const h of row.link_hosts ?? []) {
        if (h) hosts.add(h);
      }
    }
  }

  return hosts;
}

export function urlMatchesSuspendedHost(url: string, suspendedHosts: Set<string>): boolean {
  const host = hostFromUrl(url);
  if (!host) return false;
  for (const suspended of suspendedHosts) {
    if (host === suspended || host.endsWith(`.${suspended}`)) return true;
  }
  return false;
}
