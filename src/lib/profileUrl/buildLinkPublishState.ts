import {
  checkProfileUrl,
  extractUrlsFromText,
  type ProfileUrlCheckResult,
} from '@/lib/profileUrl/checkProfileUrl';
import {
  type LinkPublishState,
  verdictAllowed,
} from '@/lib/profileUrl/linkPublishState';
import { normalizeProfileUrl } from '@/lib/profileUrl/socialHosts';

export type SocialLinkInput = { label: string; url: string };

export type BuildLinkPublishInput = {
  website: string | null;
  socialLinks: SocialLinkInput[];
  bio: string | null;
  memberFullName: string | null;
};

export type BuildLinkPublishResult = {
  state: LinkPublishState;
  checks: ProfileUrlCheckResult[];
};

export async function buildLinkPublishState(
  input: BuildLinkPublishInput,
): Promise<BuildLinkPublishResult> {
  const checks: ProfileUrlCheckResult[] = [];
  const reasons: LinkPublishState['reasons'] = { social: {} };

  let websiteAllowed = true;
  const website = input.website?.trim() ?? '';
  if (website) {
    const check = await checkProfileUrl(website, { memberFullName: input.memberFullName ?? undefined });
    checks.push(check);
    websiteAllowed = verdictAllowed(check.verdict);
    if (!websiteAllowed) {
      reasons.website = check.reason;
    }
  }

  const socialByUrl: Record<string, boolean> = {};
  for (const link of input.socialLinks) {
    const url = link.url.trim();
    if (!url) continue;
    const check = await checkProfileUrl(url, { memberFullName: input.memberFullName ?? undefined });
    checks.push(check);
    const key = normalizeProfileUrl(url);
    const allowed = verdictAllowed(check.verdict);
    socialByUrl[key] = allowed;
    if (!allowed) {
      reasons.social![key] = check.reason;
    }
  }

  let bioPublic = true;
  const bio = input.bio?.trim() ?? '';
  const bioUrls = extractUrlsFromText(bio);
  for (const bioUrl of bioUrls) {
    const check = await checkProfileUrl(bioUrl, { memberFullName: input.memberFullName ?? undefined });
    checks.push(check);
    if (!verdictAllowed(check.verdict)) {
      bioPublic = false;
      reasons.bio = check.reason;
      break;
    }
  }

  if (bio && bioPublic) {
    const hasSavedLinks = website.length > 0 || input.socialLinks.some((l) => l.url.trim());
    const anyLinkBlocked =
      (website.length > 0 && !websiteAllowed)
      || Object.values(socialByUrl).some((v) => v === false);
    if (hasSavedLinks && anyLinkBlocked) {
      bioPublic = false;
      reasons.bio = reasons.bio ?? 'linked_content_blocked';
    }
  }

  const state: LinkPublishState = {
    websiteAllowed: website ? websiteAllowed : true,
    socialByUrl,
    bioPublic: bio ? bioPublic : true,
    reasons: Object.keys(reasons.social ?? {}).length > 0 || reasons.website || reasons.bio
      ? reasons
      : undefined,
    checkedAt: new Date().toISOString(),
  };

  return { state, checks };
}
