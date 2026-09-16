import { describe, expect, it } from 'vitest';

import { getPostAuthRedirect, getPostLoginRedirect } from '@/utils/postLoginRedirect';
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

describe('getPostAuthRedirect', () => {
  const completeProfile = {
    email: 'user@example.com',
    nickname: 'user',
    full_name: 'User Name',
    terms_accepted_at: '2026-01-01T00:00:00.000Z',
  };

  it('sends incomplete profiles to onboarding with the intended destination', () => {
    expect(getPostAuthRedirect(null, '/members')).toBe('/onboarding?redirectTo=%2Fmembers');
    expect(getPostAuthRedirect({ nickname: null, full_name: null }, '/gallery')).toBe(
      '/onboarding?redirectTo=%2Fgallery',
    );
  });

  it('rewrites listing pages before wrapping onboarding', () => {
    expect(getPostAuthRedirect(null, '/')).toBe('/onboarding?redirectTo=%2Faccount%2Fevents');
  });

  it('returns the post-login destination when the profile is complete', () => {
    expect(getPostAuthRedirect(completeProfile, '/members')).toBe('/members');
    expect(getPostAuthRedirect(completeProfile, '/')).toBe('/account/events');
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
      cfConnectingIp: '203.0.113.50',
      xRealIp: '1.1.1.1',
      xForwardedFor: '8.8.8.8, 1.1.1.1',
    })).toBe('203.0.113.50');
  });

  it('falls back to X-Real-IP then the first X-Forwarded-For hop', () => {
    expect(getClientIp({ xRealIp: '1.1.1.1', xForwardedFor: '8.8.8.8' })).toBe('1.1.1.1');
    expect(getClientIp({ xForwardedFor: '8.8.8.8, 1.1.1.1' })).toBe('8.8.8.8');
    expect(getClientIp({})).toBeNull();
  });
});
