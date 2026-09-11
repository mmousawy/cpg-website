import type { NextRequest } from 'next/server';

const DEFAULT_SITE_URL = 'https://creativephotography.group';

function normalizeSiteUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function isLocalHost(hostname: string): boolean {
  return hostname === '0.0.0.0'
    || hostname === '127.0.0.1'
    || hostname === 'localhost';
}

/** Public site URL from env (set per deploy in Coolify / Vercel). */
export function getConfiguredSiteUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (!configured?.trim()) return null;
  return normalizeSiteUrl(configured);
}

/**
 * Origin for server-side redirects (auth callbacks, email verification).
 * Never use `new URL(request.url).origin` behind Docker — it becomes http://0.0.0.0:3000.
 */
export function getRequestSiteUrl(request: NextRequest): string {
  const configured = getConfiguredSiteUrl();
  if (configured) return configured;

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const { origin, hostname } = new URL(request.url);
  if (!isLocalHost(hostname)) {
    return origin;
  }

  return DEFAULT_SITE_URL;
}
