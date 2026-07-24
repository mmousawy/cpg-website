'use client';

import FollowButton from '@/components/profile/FollowButton';
import type { ProfileHeaderProfile } from '@/components/profile/ProfileHeader';
import { useAuth } from '@/context/AuthContext';
import { getDomain, getSocialIcon } from '@/utils/socialIcons';

type SocialLink = { label: string; url: string };

function useProfileSocialLinks(profile: ProfileHeaderProfile) {
  const { user } = useAuth();
  const socialLinks = (profile.social_links || []) as SocialLink[];
  const hasLinks = !!(profile.website || socialLinks.length > 0);
  const showFollow = !!(profile.nickname && user?.id !== profile.id);

  return { socialLinks, hasLinks, showFollow };
}

export function ProfileDesktopSocialLinks({ profile }: { profile: ProfileHeaderProfile }) {
  const { socialLinks, hasLinks, showFollow } = useProfileSocialLinks(profile);

  if (!showFollow && !hasLinks) {
    return null;
  }

  return (
    <div
      className="mt-2 hidden flex-wrap items-center gap-2 sm:flex"
    >
      {showFollow && profile.nickname && (
        <FollowButton
          profileId={profile.id}
          profileNickname={profile.nickname}
          showLabel
        />
      )}
      {profile.website && (
        <a
          href={profile.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2 py-1 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          <svg
            className="size-4"
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
          {getDomain(profile.website)}
        </a>
      )}
      {socialLinks.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border-color bg-background-light px-2 py-1 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          {getSocialIcon(link.label)}
          {link.label}
        </a>
      ))}
    </div>
  );
}

export function ProfileMobileSocialLinks({ profile }: { profile: ProfileHeaderProfile }) {
  const { socialLinks, hasLinks, showFollow } = useProfileSocialLinks(profile);

  if (!showFollow && !hasLinks) {
    return null;
  }

  return (
    <div
      className="mt-2 flex w-full min-w-0 flex-wrap items-center gap-2 sm:hidden"
    >
      {showFollow && profile.nickname && (
        <FollowButton
          profileId={profile.id}
          profileNickname={profile.nickname}
        />
      )}
      {profile.website && (
        <a
          href={profile.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
        >
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
          {getDomain(profile.website)}
        </a>
      )}
      {socialLinks.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
        >
          {getSocialIcon(link.label)}
          {link.label}
        </a>
      ))}
    </div>
  );
}
