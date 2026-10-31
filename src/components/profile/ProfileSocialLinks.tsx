'use client';

import FollowButton from '@/components/profile/FollowButton';
import type { ProfileHeaderProfile } from '@/components/profile/ProfileHeader';
import { getPublishedProfileFields } from '@/lib/profileUrl/linkPublishState';
import {
  profileOutboundLinkLabel,
  profileSocialLinkRel,
  profileWebsiteRel,
} from '@/lib/profileUrl/profileLinkDisplay';
import { isKnownSocialHost } from '@/lib/profileUrl/socialHosts';
import { useSession } from '@/context/SessionContext';
import { getSocialIcon } from '@/utils/socialIcons';

type SocialLink = { label: string; url: string };

function useProfileSocialLinks(profile: ProfileHeaderProfile) {
  const { user } = useSession();
  const published = getPublishedProfileFields(profile);
  const hasLinks = !!(published.website || published.socialLinks.length > 0);
  const showFollow = !!(profile.nickname && user?.id !== profile.id);

  return { ...published, hasLinks, showFollow };
}

function WebsiteIcon() {
  return (
    <svg
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  );
}

export function ProfileDesktopSocialLinks({ profile }: { profile: ProfileHeaderProfile }) {
  const { website, socialLinks, hasLinks, showFollow } = useProfileSocialLinks(profile);

  if (!showFollow && !hasLinks) {
    return null;
  }

  return (
    <div
      className="hidden flex-wrap items-center gap-2 pt-px sm:flex"
    >
      {showFollow && profile.nickname && (
        <FollowButton
          profileId={profile.id}
          profileNickname={profile.nickname}
          showLabel
        />
      )}
      {website && (
        <a
          href={website}
          target="_blank"
          rel={profileWebsiteRel()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2 py-1 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          <WebsiteIcon />
          {profileOutboundLinkLabel(website, true)}
        </a>
      )}
      {socialLinks.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel={profileSocialLinkRel()}
          className="inline-flex items-center gap-2 rounded-full border border-border-color bg-background-light px-2 py-1 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          {getSocialIcon(isKnownSocialHost(link.url) ? link.url : link.url)}
          {profileOutboundLinkLabel(link.url, false)}
        </a>
      ))}
    </div>
  );
}

export function ProfileMobileSocialLinks({ profile }: { profile: ProfileHeaderProfile }) {
  const { website, socialLinks, hasLinks, showFollow } = useProfileSocialLinks(profile);

  if (!showFollow && !hasLinks) {
    return null;
  }

  return (
    <div
      className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:hidden"
    >
      {showFollow && profile.nickname && (
        <FollowButton
          profileId={profile.id}
          profileNickname={profile.nickname}
        />
      )}
      {website && (
        <a
          href={website}
          target="_blank"
          rel={profileWebsiteRel()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
        >
          <WebsiteIcon />
          {profileOutboundLinkLabel(website, true)}
        </a>
      )}
      {socialLinks.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel={profileSocialLinkRel()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
        >
          {getSocialIcon(link.url)}
          {profileOutboundLinkLabel(link.url, false)}
        </a>
      ))}
    </div>
  );
}

export function ProfileSocialSection({ profile }: { profile: ProfileHeaderProfile }) {
  const { hasLinks, showFollow } = useProfileSocialLinks(profile);

  if (!showFollow && !hasLinks) {
    return null;
  }

  return (
    <div
      className="mb-4"
    >
      <ProfileDesktopSocialLinks
        profile={profile}
      />
      <ProfileMobileSocialLinks
        profile={profile}
      />
    </div>
  );
}
