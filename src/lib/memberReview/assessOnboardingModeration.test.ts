import { describe, expect, it } from 'vitest';

import { assessOnboardingModeration } from '@/lib/memberReview/assessOnboardingModeration';
import {
  isServiceOfferText,
  looksLikeCommercialProfileText,
} from '@/lib/profileUrl/classifyPageContent';

describe('isServiceOfferText', () => {
  it('flags certification training pitches', () => {
    expect(isServiceOfferText('Universal Lifeguard Certification and Lifeguard Training')).toBe(true);
  });

  it('allows ordinary bios', () => {
    expect(isServiceOfferText('Landscape and street photography from Amsterdam.')).toBe(false);
  });
});

describe('looksLikeCommercialProfileText', () => {
  it('flags advertising display names without a URL', () => {
    expect(looksLikeCommercialProfileText('Great Tibet Tour')).toBe(true);
    expect(looksLikeCommercialProfileText('Universal lifeguard certification')).toBe(true);
    expect(looksLikeCommercialProfileText('law dissertation')).toBe(true);
  });

  it('leaves photographer names and bios alone', () => {
    expect(looksLikeCommercialProfileText('Karsten Risseeuw')).toBe(false);
    expect(looksLikeCommercialProfileText('Landscape and street photography from Amsterdam.')).toBe(false);
    expect(looksLikeCommercialProfileText('Tibet tour photography')).toBe(false);
  });
});

describe('assessOnboardingModeration', () => {
  it('holds when a URL check is inconclusive', () => {
    const result = assessOnboardingModeration({
      fullName: 'Alex',
      bio: 'See https://example.com',
      website: null,
      socialLinks: [],
      checks: [{
        url: 'https://example.com',
        verdict: 'pending',
        reason: 'inconclusive',
        title: 'Example',
        schemaTypes: [],
        safeBrowsing: 'safe_browsing_skipped',
      }],
      suspendedLinkHosts: new Set(),
    });
    expect(result.outcome).toBe('under_review');
  });

  it('suspends on service bio text', () => {
    const result = assessOnboardingModeration({
      fullName: 'Great Tibet Tour',
      bio: 'Your travel agency in Tibet',
      website: null,
      socialLinks: [],
      checks: [],
      suspendedLinkHosts: new Set(),
    });
    expect(result.outcome).toBe('suspend');
  });

  it('holds a commercial display name even with no URLs', () => {
    const result = assessOnboardingModeration({
      fullName: 'Great Tibet Tour',
      bio: null,
      website: null,
      socialLinks: [],
      checks: [],
      suspendedLinkHosts: new Set(),
    });
    expect(result.outcome).toBe('under_review');
  });

  it('publishes an ordinary photographer name with no URLs', () => {
    const result = assessOnboardingModeration({
      fullName: 'Karsten Risseeuw',
      bio: 'Landscape and street photography from Amsterdam.',
      website: null,
      socialLinks: [],
      checks: [],
      suspendedLinkHosts: new Set(),
    });
    expect(result.outcome).toBe('publish');
  });
});
