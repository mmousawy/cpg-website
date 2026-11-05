import { describe, expect, it } from 'vitest';

import { assessOnboardingModeration } from '@/lib/memberReview/assessOnboardingModeration';
import { isServiceOfferText } from '@/lib/profileUrl/classifyPageContent';

describe('isServiceOfferText', () => {
  it('flags certification training pitches', () => {
    expect(isServiceOfferText('Universal Lifeguard Certification and Lifeguard Training')).toBe(true);
  });

  it('allows ordinary bios', () => {
    expect(isServiceOfferText('Landscape and street photography from Amsterdam.')).toBe(false);
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
});
