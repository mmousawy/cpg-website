import { describe, expect, it } from 'vitest';

import {
  isDocumentNavigation,
  isOnboardingGateExemptPath,
  isPrefetchRequest,
  parseOnboardingCookie,
  shouldClassifyOnboarding,
  shouldRedirectPendingOnboarding,
} from '@/utils/onboardingCookie';

describe('parseOnboardingCookie', () => {
  it('accepts pending and complete values', () => {
    expect(parseOnboardingCookie('pending')).toBe('pending');
    expect(parseOnboardingCookie('complete')).toBe('complete');
  });

  it('ignores missing or forged values', () => {
    expect(parseOnboardingCookie(null)).toBeNull();
    expect(parseOnboardingCookie(undefined)).toBeNull();
    expect(parseOnboardingCookie('yes')).toBeNull();
  });
});

describe('onboarding gate paths', () => {
  it('skips onboarding, auth, api, and legal pages', () => {
    expect(isOnboardingGateExemptPath('/onboarding')).toBe(true);
    expect(isOnboardingGateExemptPath('/api/likes')).toBe(true);
    expect(isOnboardingGateExemptPath('/login')).toBe(true);
    expect(isOnboardingGateExemptPath('/help/getting-started')).toBe(true);
    expect(isOnboardingGateExemptPath('/terms')).toBe(true);
    expect(isOnboardingGateExemptPath('/privacy')).toBe(true);
  });

  it('gates public content pages', () => {
    expect(isOnboardingGateExemptPath('/')).toBe(false);
    expect(isOnboardingGateExemptPath('/members')).toBe(false);
    expect(isOnboardingGateExemptPath('/gallery/photos')).toBe(false);
    expect(isOnboardingGateExemptPath('/@karsten/photo/0gs9l')).toBe(false);
  });
});

describe('shouldRedirectPendingOnboarding', () => {
  it('redirects public paths when the session is pending', () => {
    expect(shouldRedirectPendingOnboarding({
      pathname: '/members',
      hasAuthCookie: true,
      cookie: 'pending',
    })).toBe(true);
    expect(shouldRedirectPendingOnboarding({
      pathname: '/gallery/photos',
      hasAuthCookie: true,
      cookie: 'pending',
    })).toBe(true);
  });

  it('does not redirect complete profiles, guests, or exempt paths', () => {
    expect(shouldRedirectPendingOnboarding({
      pathname: '/members',
      hasAuthCookie: true,
      cookie: 'complete',
    })).toBe(false);
    expect(shouldRedirectPendingOnboarding({
      pathname: '/members',
      hasAuthCookie: false,
      cookie: 'pending',
    })).toBe(false);
    expect(shouldRedirectPendingOnboarding({
      pathname: '/onboarding',
      hasAuthCookie: true,
      cookie: 'pending',
    })).toBe(false);
    expect(shouldRedirectPendingOnboarding({
      pathname: '/api/likes',
      hasAuthCookie: true,
      cookie: 'pending',
    })).toBe(false);
  });
});

describe('shouldClassifyOnboarding', () => {
  it('classifies missing cookies on document navigations with a session', () => {
    expect(shouldClassifyOnboarding({
      pathname: '/gallery/photos',
      hasAuthCookie: true,
      cookie: null,
      isDocument: true,
    })).toBe(true);
  });

  it('does not classify prefetches, complete cookies, or exempt paths', () => {
    expect(shouldClassifyOnboarding({
      pathname: '/gallery/photos',
      hasAuthCookie: true,
      cookie: null,
      isDocument: false,
    })).toBe(false);
    expect(shouldClassifyOnboarding({
      pathname: '/gallery/photos',
      hasAuthCookie: true,
      cookie: 'complete',
      isDocument: true,
    })).toBe(false);
    expect(shouldClassifyOnboarding({
      pathname: '/onboarding',
      hasAuthCookie: true,
      cookie: null,
      isDocument: true,
    })).toBe(false);
    expect(shouldClassifyOnboarding({
      pathname: '/api/likes',
      hasAuthCookie: true,
      cookie: null,
      isDocument: true,
    })).toBe(false);
  });
});

describe('document vs prefetch headers', () => {
  it('treats Next-Router-Prefetch and Purpose: prefetch as prefetch', () => {
    expect(isPrefetchRequest(new Headers({ 'Next-Router-Prefetch': '1' }))).toBe(true);
    expect(isPrefetchRequest(new Headers({ Purpose: 'prefetch' }))).toBe(true);
    expect(isPrefetchRequest(new Headers({ 'Sec-Purpose': 'prefetch' }))).toBe(true);
    expect(isPrefetchRequest(new Headers({ 'Sec-Fetch-Dest': 'document' }))).toBe(false);
  });

  it('only treats Sec-Fetch-Dest: document as a document navigation', () => {
    expect(isDocumentNavigation(new Headers({ 'Sec-Fetch-Dest': 'document' }))).toBe(true);
    expect(isDocumentNavigation(new Headers({
      'Sec-Fetch-Dest': 'document',
      'Next-Router-Prefetch': '1',
    }))).toBe(false);
    expect(isDocumentNavigation(new Headers({ RSC: '1' }))).toBe(false);
  });
});
