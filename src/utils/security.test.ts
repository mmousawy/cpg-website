import { describe, expect, it } from 'vitest';

import { getPostLoginRedirect } from '@/utils/postLoginRedirect';
import { getClientIp, safeInternalPath, safeJsonLdStringify, safePixelWidth } from '@/utils/security';

describe('safeInternalPath', () => {
  it('allows normal relative paths', () => {
    expect(safeInternalPath('/account/events')).toBe('/account/events');
  });

  it('blocks protocol-relative and absolute URLs', () => {
    expect(safeInternalPath('//evil.example')).toBe('/');
    expect(safeInternalPath('https://evil.example')).toBe('/');
    expect(safeInternalPath('/@evil.com')).toBe('/');
  });
});

describe('getPostLoginRedirect', () => {
  it('redirects listing pages to account dashboard', () => {
    expect(getPostLoginRedirect('/')).toBe('/account/events');
    expect(getPostLoginRedirect('/events')).toBe('/account/events');
  });

  it('preserves safe deep links', () => {
    expect(getPostLoginRedirect('/members')).toBe('/members');
  });
});

describe('safeJsonLdStringify', () => {
  it('escapes script breakouts', () => {
    const output = safeJsonLdStringify({ title: '</script><script>alert(1)</script>' });
    expect(output).not.toContain('</script>');
    expect(output).toContain('\\u003c/script');
  });
});

describe('safePixelWidth', () => {
  it('rejects injection attempts', () => {
    expect(safePixelWidth('100;background:url(http://evil)')).toBeNull();
    expect(safePixelWidth('640')).toBe(640);
  });
});

describe('getClientIp', () => {
  it('prefers Cloudflare connecting IP over spoofable forwards', () => {
    expect(getClientIp({
      cfConnectingIp: '92.254.97.120',
      xRealIp: '1.1.1.1',
      xForwardedFor: '8.8.8.8, 1.1.1.1',
    })).toBe('92.254.97.120');
  });

  it('falls back to X-Real-IP then the first X-Forwarded-For hop', () => {
    expect(getClientIp({ xRealIp: '1.1.1.1', xForwardedFor: '8.8.8.8' })).toBe('1.1.1.1');
    expect(getClientIp({ xForwardedFor: '8.8.8.8, 1.1.1.1' })).toBe('8.8.8.8');
    expect(getClientIp({})).toBeNull();
  });
});
