import { describe, expect, it } from 'vitest';

import {
  matchesPath,
  needsProxyAuthSession,
  needsProxyOwnProfile,
} from '@/utils/proxyAuth';
import {
  hasSupabaseAuthCookies,
  isSupabaseAuthCookieName,
} from '@/utils/supabase/authCookie';

describe('matchesPath', () => {
  it('matches exact and nested paths without prefix collisions', () => {
    expect(matchesPath('/account', '/account')).toBe(true);
    expect(matchesPath('/account/events', '/account')).toBe(true);
    expect(matchesPath('/account-deleted', '/account')).toBe(false);
  });
});

describe('needsProxyAuthSession', () => {
  it('runs auth on gated routes and APIs', () => {
    expect(needsProxyAuthSession('/account/events')).toBe(true);
    expect(needsProxyAuthSession('/admin')).toBe(true);
    expect(needsProxyAuthSession('/login')).toBe(true);
    expect(needsProxyAuthSession('/onboarding')).toBe(true);
    expect(needsProxyAuthSession('/members')).toBe(true);
    expect(needsProxyAuthSession('/members/all')).toBe(true);
    expect(needsProxyAuthSession('/api/likes')).toBe(true);
    expect(needsProxyAuthSession('/cancel/abc')).toBe(true);
  });

  it('skips public content pages that dominate traffic', () => {
    expect(needsProxyAuthSession('/')).toBe(false);
    expect(needsProxyAuthSession('/gallery/photos')).toBe(false);
    expect(needsProxyAuthSession('/@karsten/photo/0gs9l')).toBe(false);
    expect(needsProxyAuthSession('/@karsten/album/archaic-landscapes')).toBe(false);
    expect(needsProxyAuthSession('/events')).toBe(false);
    expect(needsProxyAuthSession('/challenges')).toBe(false);
  });
});

describe('needsProxyOwnProfile', () => {
  it('loads the profile only where gates need it', () => {
    expect(needsProxyOwnProfile('/account/photos')).toBe(true);
    expect(needsProxyOwnProfile('/admin/members')).toBe(true);
    expect(needsProxyOwnProfile('/onboarding')).toBe(true);
    expect(needsProxyOwnProfile('/api/likes')).toBe(true);
    expect(needsProxyOwnProfile('/login')).toBe(false);
    expect(needsProxyOwnProfile('/signup')).toBe(false);
    expect(needsProxyOwnProfile('/members')).toBe(false);
    expect(needsProxyOwnProfile('/gallery/photos')).toBe(false);
    expect(needsProxyOwnProfile('/@karsten/photo/0gs9l')).toBe(false);
  });
});

describe('supabase auth cookies', () => {
  it('detects chunked sb auth-token cookies', () => {
    expect(isSupabaseAuthCookieName('sb-xxxx-auth-token')).toBe(true);
    expect(isSupabaseAuthCookieName('sb-xxxx-auth-token.0')).toBe(true);
    expect(isSupabaseAuthCookieName('theme')).toBe(false);
    expect(hasSupabaseAuthCookies([{ name: 'theme' }])).toBe(false);
    expect(hasSupabaseAuthCookies([{ name: 'sb-xxxx-auth-token.0' }])).toBe(true);
  });
});
