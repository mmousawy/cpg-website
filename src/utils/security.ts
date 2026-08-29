import { timingSafeEqual } from 'crypto';

/**
 * Returns a safe same-origin relative path, or the fallback.
 * Blocks protocol-relative paths, absolute URLs, and userinfo (@) tricks.
 */
export function safeInternalPath(
  path: string | null | undefined,
  fallback = '/',
): string {
  if (!path || typeof path !== 'string') {
    return fallback;
  }

  const trimmed = path.trim();

  if (
    !trimmed.startsWith('/')
    || trimmed.startsWith('//')
    || trimmed.includes('@')
    || trimmed.includes('\\')
  ) {
    return fallback;
  }

  return trimmed;
}

/** Compare secrets in constant time. Returns false if either value is missing. */
export function safeEqualSecret(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

/**
 * Client IP from trusted edge headers.
 * Prefer CF-Connecting-IP (Cloudflare overwrites it); then X-Real-IP;
 * then the first X-Forwarded-For hop.
 */
export function getClientIp({
  cfConnectingIp = null,
  xRealIp = null,
  xForwardedFor = null,
}: {
  cfConnectingIp?: string | null
  xRealIp?: string | null
  xForwardedFor?: string | null
} = {}): string | null {
  if (cfConnectingIp?.trim()) {
    return cfConnectingIp.trim();
  }

  if (xRealIp?.trim()) {
    return xRealIp.trim();
  }

  if (xForwardedFor?.trim()) {
    const first = xForwardedFor.split(',')[0]?.trim();
    return first || null;
  }

  return null;
}

/** Escape `<` in JSON-LD to prevent script breakout via dangerouslySetInnerHTML. */
export function safeJsonLdStringify(data: object | object[]): string {
  const json = Array.isArray(data) ? data : [data];
  const serialized = JSON.stringify(json.length === 1 ? json[0] : json);
  return serialized.replace(/</g, '\\u003c');
}

/** Sanitize a file extension for storage object keys. */
export function safeFileExtension(
  filename: string,
  allowed: string[] = ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  fallback = 'jpg',
): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const normalized = ext === 'jpeg' ? 'jpg' : ext;
  return allowed.includes(normalized) ? normalized : fallback;
}

/** Validate numeric pixel width for email img tags. */
export function safePixelWidth(width: string | undefined): number | null {
  if (!width || !/^\d+$/.test(width)) return null;
  const parsed = Number.parseInt(width, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1200) {
    return null;
  }
  return parsed;
}
