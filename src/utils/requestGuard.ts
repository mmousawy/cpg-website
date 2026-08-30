import {
  crawlerUaSnippets,
  scraperHttpClientSnippets,
  scraperUaFingerprints,
  type ScraperUaFingerprint,
} from '@/config/scraperUserAgents';

export function parseIpList(value: string | undefined): string[] {
  return value?.split(',').map((ip) => ip.trim()).filter(Boolean) ?? [];
}

/** `sm-g999+buildfoo, other+tokens` → extra fingerprints without a deploy. */
export function parseFingerprintList(value: string | undefined): string[][] {
  if (!value?.trim()) return [];
  return value.split(',').map((entry) => {
    return entry.split('+').map((token) => token.trim().toLowerCase()).filter(Boolean);
  }).filter((tokens) => tokens.length > 0);
}

const envFingerprints: readonly ScraperUaFingerprint[] = parseFingerprintList(
  process.env.SCRAPER_UA_FINGERPRINTS,
).map((tokens, index) => ({
  id: `env-${index}`,
  tokens,
  note: 'SCRAPER_UA_FINGERPRINTS',
}));

const allFingerprints: readonly ScraperUaFingerprint[] = [
  ...scraperUaFingerprints,
  ...envFingerprints,
];

export function isBlockedIp(
  ip: string | null,
  extraBlockedIps: readonly string[] = [],
): boolean {
  if (!ip) return false;
  return extraBlockedIps.includes(ip);
}

function matchesTokens(userAgent: string, tokens: readonly string[]): boolean {
  return tokens.every((token) => userAgent.includes(token));
}

/**
 * DeviceAtlas-style copy-paste UAs and HTTP-client defaults.
 * Honest crawlers (Googlebot, etc.) are not included — those still get pages.
 */
export function isKnownScraperUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.trim().toLowerCase();
  if (!ua) return false;
  if (ua === 'node') return true;
  if (scraperHttpClientSnippets.some((snippet) => ua.includes(snippet))) return true;
  return allFingerprints.some((fingerprint) => matchesTokens(ua, fingerprint.tokens));
}

/** Skip view tracking and similar non-critical writes. Empty UA counts as a bot. */
export function isBotUserAgent(userAgent: string | null): boolean {
  if (!userAgent || userAgent.trim() === '') return true;
  if (isKnownScraperUserAgent(userAgent)) return true;
  const ua = userAgent.toLowerCase();
  return crawlerUaSnippets.some((pattern) => ua.includes(pattern));
}

export function shouldBlockClient(
  ip: string | null,
  userAgent: string | null,
  extraBlockedIps: readonly string[] = [],
): boolean {
  return isBlockedIp(ip, extraBlockedIps) || isKnownScraperUserAgent(userAgent);
}
