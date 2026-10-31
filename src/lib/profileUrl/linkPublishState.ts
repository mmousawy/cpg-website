import { normalizeProfileUrl } from '@/lib/profileUrl/socialHosts';
import type { ProfileUrlVerdict } from '@/lib/profileUrl/classifyPageContent';

export type LinkPublishState = {
  websiteAllowed: boolean;
  socialByUrl: Record<string, boolean>;
  bioPublic: boolean;
  reasons?: {
    website?: string;
    bio?: string;
    social?: Record<string, string>;
  };
  checkedAt: string;
};

export type SocialLink = { label: string; url: string };

export function isLinkPublishGrandfathered(state: LinkPublishState | null | undefined): boolean {
  return state == null;
}

export function publishedWebsite(
  website: string | null | undefined,
  state: LinkPublishState | null | undefined,
): string | null {
  if (!website?.trim()) return null;
  if (isLinkPublishGrandfathered(state)) return website;
  return state!.websiteAllowed ? website : null;
}

export function publishedSocialLinks(
  socialLinks: SocialLink[] | null | undefined,
  state: LinkPublishState | null | undefined,
): SocialLink[] {
  const links = socialLinks ?? [];
  if (isLinkPublishGrandfathered(state)) return links;
  return links.filter((link) => {
    const key = normalizeProfileUrl(link.url);
    return state!.socialByUrl[key] === true;
  });
}

export function publishedBio(
  bio: string | null | undefined,
  state: LinkPublishState | null | undefined,
): string | null {
  if (!bio?.trim()) return null;
  if (isLinkPublishGrandfathered(state)) return bio;
  return state!.bioPublic ? bio : null;
}

export function parseLinkPublishState(raw: unknown): LinkPublishState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.websiteAllowed !== 'boolean' || typeof o.bioPublic !== 'boolean') {
    return null;
  }
  const socialByUrl =
    o.socialByUrl && typeof o.socialByUrl === 'object' && !Array.isArray(o.socialByUrl)
      ? (o.socialByUrl as Record<string, boolean>)
      : {};
  return {
    websiteAllowed: o.websiteAllowed,
    socialByUrl,
    bioPublic: o.bioPublic,
    reasons: o.reasons as LinkPublishState['reasons'],
    checkedAt: typeof o.checkedAt === 'string' ? o.checkedAt : new Date(0).toISOString(),
  };
}

export function verdictAllowed(verdict: ProfileUrlVerdict): boolean {
  return verdict === 'allow';
}

export function getPublishedProfileFields(profile: {
  website: string | null | undefined;
  social_links?: SocialLink[] | null;
  bio?: string | null | undefined;
  link_publish_state?: unknown;
}): {
  website: string | null;
  socialLinks: SocialLink[];
  bio: string | null;
} {
  const state = parseLinkPublishState(profile.link_publish_state);
  return {
    website: publishedWebsite(profile.website, state),
    socialLinks: publishedSocialLinks(profile.social_links, state),
    bio: publishedBio(profile.bio, state),
  };
}
