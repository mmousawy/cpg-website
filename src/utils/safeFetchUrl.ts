import dns from 'dns/promises';
import { isIP } from 'net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
]);

function isPrivateOrReservedIp(ip: string): boolean {
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') {
    return true;
  }

  if (isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;

    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }

  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
    if (lower.startsWith('fe80')) return true; // link-local
    return false;
  }

  return true;
}

async function resolveHost(hostname: string): Promise<string[]> {
  if (isIP(hostname)) {
    return [hostname];
  }

  const results = await dns.lookup(hostname, { all: true, verbatim: true });
  return results.map((entry) => entry.address);
}

/**
 * Returns true when a URL is safe for server-side fetch (blocks private/metadata targets).
 */
export async function isSafeFetchUrl(rawUrl: string): Promise<boolean> {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local')) {
    return false;
  }

  try {
    const addresses = await resolveHost(hostname);
    return addresses.every((address) => !isPrivateOrReservedIp(address));
  } catch {
    return false;
  }
}
