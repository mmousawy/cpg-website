import { extractUrlsFromText, type ProfileUrlCheckResult } from '@/lib/profileUrl/checkProfileUrl';
import { isServiceOfferText } from '@/lib/profileUrl/classifyPageContent';
import { urlMatchesSuspendedHost } from '@/lib/profileUrl/suspendedLinkHosts';

export type OnboardingModerationOutcome = 'publish' | 'under_review' | 'suspend';

export type OnboardingModerationResult = {
  outcome: OnboardingModerationOutcome;
  suspendedReason: string | null;
  checks: ProfileUrlCheckResult[];
};

function isUrlBlock(check: ProfileUrlCheckResult): boolean {
  if (check.reason === 'safe_browsing') return true;
  return check.verdict === 'block';
}

function isUrlPending(check: ProfileUrlCheckResult): boolean {
  return check.verdict === 'pending';
}

function profileUrls(input: {
  website: string | null;
  bio: string | null;
  socialLinks: { url: string }[];
}): string[] {
  const urls: string[] = [];
  if (input.website?.trim()) urls.push(input.website.trim());
  for (const link of input.socialLinks) {
    if (link.url.trim()) urls.push(link.url.trim());
  }
  for (const url of extractUrlsFromText(input.bio ?? '')) {
    urls.push(url);
  }
  return urls;
}

export function assessOnboardingModeration(input: {
  fullName: string | null;
  bio: string | null;
  website: string | null;
  socialLinks: { url: string }[];
  checks: ProfileUrlCheckResult[];
  suspendedLinkHosts: Set<string>;
}): OnboardingModerationResult {
  const checks = [...input.checks];
  const fullName = input.fullName?.trim() ?? '';
  const bio = input.bio?.trim() ?? '';

  if (fullName && isServiceOfferText(fullName)) {
    return {
      outcome: 'suspend',
      suspendedReason: 'Advertising a website',
      checks,
    };
  }
  if (bio && isServiceOfferText(bio)) {
    return {
      outcome: 'suspend',
      suspendedReason: 'Advertising a website',
      checks,
    };
  }

  for (const url of profileUrls(input)) {
    if (urlMatchesSuspendedHost(url, input.suspendedLinkHosts)) {
      return {
        outcome: 'suspend',
        suspendedReason: 'Advertising a website',
        checks,
      };
    }
  }

  if (checks.some(isUrlBlock)) {
    const unsafe = checks.some((c) => c.reason === 'safe_browsing');
    return {
      outcome: 'suspend',
      suspendedReason: unsafe ? 'Unsafe website' : 'Advertising a website',
      checks,
    };
  }

  if (checks.length > 0 && checks.some(isUrlPending)) {
    return {
      outcome: 'under_review',
      suspendedReason: null,
      checks,
    };
  }

  return {
    outcome: 'publish',
    suspendedReason: null,
    checks,
  };
}
