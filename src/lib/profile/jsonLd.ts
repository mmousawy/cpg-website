import type { Interest } from '@/types/interests';
import { getPublishedProfileFields } from '@/lib/profileUrl/linkPublishState';
import { isKnownSocialHost } from '@/lib/profileUrl/socialHosts';
import { getOrganizationJsonLd } from '@/lib/seo/jsonLd';
import { getAbsoluteUrl } from '@/utils/metadata';

export function getPersonJsonLdId(nickname: string): string {
  return `${getProfilePageUrl(nickname)}#person`;
}

export function getProfilePageUrl(nickname: string): string {
  return getAbsoluteUrl(`/@${encodeURIComponent(nickname)}`);
}

function interactionCounter(interactionType: string, userInteractionCount: number) {
  return {
    '@type': 'InteractionCounter',
    interactionType,
    userInteractionCount,
  };
}

type ProfileJsonLdInput = {
  nickname: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  website?: string | null;
  socialLinks?: Array<{ label: string; url: string }> | null;
  bio?: string | null;
  linkPublishState?: unknown;
  interests?: Interest[] | null;
  followerCount?: number;
  followingCount?: number;
  publicPhotoCount?: number;
  likesGiven?: number;
};

export function buildPersonJsonLd(input: ProfileJsonLdInput) {
  const published = getPublishedProfileFields({
    website: input.website,
    social_links: input.socialLinks,
    bio: input.bio,
    link_publish_state: input.linkPublishState,
  });
  const profileUrl = getProfilePageUrl(input.nickname);
  const sameAs = [
    ...published.socialLinks.filter((link) => isKnownSocialHost(link.url)).map((link) => link.url),
    ...(published.website ? [published.website] : []),
  ];
  const interestNames = (input.interests ?? [])
    .map((interest) => interest.name)
    .filter(Boolean);
  const personId = getPersonJsonLdId(input.nickname);
  const agentStats = [
    ...(typeof input.followingCount === 'number'
      ? [interactionCounter('https://schema.org/FollowAction', input.followingCount)]
      : []),
    ...(typeof input.publicPhotoCount === 'number'
      ? [interactionCounter('https://schema.org/WriteAction', input.publicPhotoCount)]
      : []),
    ...(typeof input.likesGiven === 'number'
      ? [interactionCounter('https://schema.org/LikeAction', input.likesGiven)]
      : []),
  ];

  return {
    '@type': 'Person',
    '@id': personId,
    name: input.fullName?.trim() || `@${input.nickname}`,
    alternateName: `@${input.nickname}`,
    identifier: input.nickname,
    url: profileUrl,
    ...(published.bio && { description: published.bio }),
    ...(input.avatarUrl && { image: getAbsoluteUrl(input.avatarUrl) }),
    ...(sameAs.length > 0 && { sameAs }),
    memberOf: getOrganizationJsonLd(),
    ...(interestNames.length > 0 && { knowsAbout: interestNames }),
    ...(typeof input.followerCount === 'number' && {
      interactionStatistic: interactionCounter(
        'https://schema.org/FollowAction',
        input.followerCount,
      ),
    }),
    ...(agentStats.length > 0 && { agentInteractionStatistic: agentStats }),
  };
}

export function buildProfilePageJsonLd(input: ProfileJsonLdInput) {
  const profileUrl = getProfilePageUrl(input.nickname);
  const person = buildPersonJsonLd(input);

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: profileUrl,
    ...(input.createdAt && { dateCreated: input.createdAt }),
    ...(input.updatedAt && { dateModified: input.updatedAt }),
    mainEntity: person,
  };
}

export function buildPersonRefJsonLd(nickname: string, name: string) {
  return {
    '@type': 'Person',
    '@id': getPersonJsonLdId(nickname),
    name,
    url: getProfilePageUrl(nickname),
  };
}
