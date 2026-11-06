import { assessOnboardingModeration, type OnboardingModerationResult } from '@/lib/memberReview/assessOnboardingModeration';
import { matchesSuspendedRepeat } from '@/lib/memberReview/ipBlocking';
import type { ProfileUrlCheckResult } from '@/lib/profileUrl/checkProfileUrl';
import { getSuspendedProfileLinkHosts } from '@/lib/profileUrl/suspendedLinkHosts';

export async function evaluateProfileModeration(input: {
  nickname: string;
  fullName: string | null;
  website: string | null;
  bio: string | null;
  socialLinks: { label: string; url: string }[];
  checks: ProfileUrlCheckResult[];
  clientIp: string | null;
}): Promise<OnboardingModerationResult> {
  const isRepeat = await matchesSuspendedRepeat({
    nickname: input.nickname,
    fullName: input.fullName,
    website: input.website,
    bio: input.bio,
    socialLinks: input.socialLinks,
    clientIp: input.clientIp,
  });

  if (isRepeat) {
    return {
      outcome: 'suspend',
      suspendedReason: 'Repeat of a suspended account',
      checks: input.checks,
    };
  }

  return assessOnboardingModeration({
    fullName: input.fullName,
    bio: input.bio,
    website: input.website,
    socialLinks: input.socialLinks,
    checks: input.checks,
    suspendedLinkHosts: await getSuspendedProfileLinkHosts(),
  });
}
