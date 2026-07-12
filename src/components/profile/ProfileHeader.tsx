import ArrowLink from '@/components/shared/ArrowLink';
import BlurImage from '@/components/shared/BlurImage';
import ClickableAvatar from '@/components/shared/ClickableAvatar';
import ProfileActionsPopover from '@/components/shared/ProfileActionsPopover';
import { getProfileBannerColors } from '@/utils/profileBannerColor';
import { getDomain, getSocialIcon } from '@/utils/socialIcons';
import clsx from 'clsx';
import type { ReactNode } from 'react';

type SocialLink = { label: string; url: string };

/** Banner aspect (width / height) — keep in sync with ProfileBannerCropper */
export const PROFILE_BANNER_ASPECT = 3.2;

/** Decode dimensions for banner blurhash placeholders */
const PROFILE_BANNER_BLURHASH_WIDTH = 64;
const PROFILE_BANNER_BLURHASH_HEIGHT = Math.round(PROFILE_BANNER_BLURHASH_WIDTH / PROFILE_BANNER_ASPECT);

export type ProfileHeaderProfile = {
  id: string;
  nickname: string | null;
  full_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  banner_blurhash?: string | null;
  website: string | null;
  social_links?: SocialLink[] | null;
};

type ProfileHeaderProps = {
  profile: ProfileHeaderProfile;
};

/** Height of the profile hero banner — keep in sync with ProfileBannerCropper aspect */
export const profileHeroBannerHeightClassName =
  'aspect-[3.2/1] w-full min-h-[10rem] max-h-[18rem] overflow-hidden';

/** Shorter height for in-settings profile preview */
export const profileHeroBannerPreviewHeightClassName =
  'h-32 min-h-32 sm:h-40 sm:min-h-40 overflow-hidden';

/** Extra top spacing below the profile hero on mobile */
export const profileHeroMobileGapClassName = 'max-sm:pt-4!';

/** Tight top spacing below the profile hero */
export const profileHeroPageClassName = `${profileHeroMobileGapClassName} sm:pt-0! pb-4! md:pt-4! md:pb-6!`;

function ProfileDesktopLinks({ profile }: { profile: ProfileHeaderProfile }) {
  const socialLinks = (profile.social_links || []) as SocialLink[];
  const hasLinks = profile.website || socialLinks.length > 0;

  if (!hasLinks) {
    return null;
  }

  return (
    <div
      className="hidden sm:flex flex-wrap items-center gap-2 sm:mt-2"
    >
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

function ProfileMobileLinks({ profile }: { profile: ProfileHeaderProfile }) {
  const socialLinks = (profile.social_links || []) as SocialLink[];
  const hasLinks = profile.website || socialLinks.length > 0;

  if (!hasLinks) {
    return null;
  }

  return (
    <div
      className="mt-2 flex w-full min-w-0 flex-wrap items-center gap-2 sm:hidden"
    >
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

function ProfileHeaderRow({
  profile,
  hideSocialLinks = false,
  variant = 'default',
}: {
  profile: ProfileHeaderProfile;
  hideSocialLinks?: boolean;
  variant?: 'default' | 'preview';
}) {
  const isPreview = variant === 'preview';

  return (
    <div
      className="mb-0 flex items-center gap-[clamp(0.5rem,2svw,1rem)]"
    >
      <div
        className="relative shrink-0 rounded-full outline-2 outline-transparent outline-offset-2 focus-within:outline-primary transition-none"
      >
        <div
          className={clsx(
            'flex items-center justify-center overflow-hidden rounded-full border-2 border-border-color',
            isPreview
              ? 'size-16 sm:size-20'
              : 'size-[clamp(4.5rem,10svw,6rem)] md:size-[100px]',
          )}
        >
          <ClickableAvatar
            avatarUrl={profile.avatar_url}
            fullName={profile.full_name}
            className="size-full"
            suppressFocusOutline
          />
        </div>
      </div>
      <div
        className="min-w-0 flex-1"
      >
        <div
          className="flex items-start justify-between gap-2"
        >
          <div
            className="min-w-0"
          >
            <h1
              className={clsx(
                'leading-tight font-bold line-clamp-2 font-heading',
                isPreview
                  ? 'text-xl sm:text-2xl'
                  : 'text-[clamp(1.5rem,4.5svw,2rem)]',
              )}
            >
              {profile.full_name || `@${profile.nickname}`}
            </h1>
            {profile.full_name && (
              <p
                className={clsx(
                  'opacity-80 leading-tight ',
                  isPreview ? 'text-base sm:text-lg' : 'text-[clamp(0.875rem,2svw,1.125rem)]',
                )}
              >
                @
                {profile.nickname}
              </p>
            )}
          </div>
          {!hideSocialLinks && profile.nickname && (
            <ProfileActionsPopover
              profileId={profile.id}
              profileNickname={profile.nickname}
            />
          )}
        </div>
        {!hideSocialLinks && (
          <ProfileDesktopLinks
            profile={profile}
          />
        )}
      </div>
    </div>
  );
}

export function ProfileHeroBanner({
  profile,
  hideSocialLinks = false,
  variant = 'default',
}: ProfileHeaderProps & {
  hideSocialLinks?: boolean;
  variant?: 'default' | 'preview';
}) {
  const isPreview = variant === 'preview';
  const hasBannerImage = !!profile.banner_url;
  const isLocalBanner = profile.banner_url?.startsWith('blob:') || profile.banner_url?.startsWith('data:');
  const solidBannerColors = profile.nickname
    ? getProfileBannerColors(profile.nickname)
    : undefined;

  return (
    <div
      className={clsx(
        'relative w-full shrink-0',
        isPreview ? profileHeroBannerPreviewHeightClassName : profileHeroBannerHeightClassName,
      )}
    >
      <div
        className="absolute inset-0 overflow-hidden"
      >
        {hasBannerImage ? (
          <BlurImage
            src={profile.banner_url!}
            alt={`Banner for @${profile.nickname}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1920px"
            quality={92}
            blurhashWidth={PROFILE_BANNER_BLURHASH_WIDTH}
            blurhashHeight={PROFILE_BANNER_BLURHASH_HEIGHT}
            blurhash={profile.banner_blurhash}
            preload
            loading="eager"
            unoptimized={isLocalBanner}
          />
        ) : (
          <div
            className={clsx(
              'absolute inset-0',
              solidBannerColors ? 'profile-hero-solid' : 'bg-background-light',
            )}
            style={
              solidBannerColors
                ? ({
                  '--profile-banner-color-light': solidBannerColors.light,
                  '--profile-banner-color-dark': solidBannerColors.dark,
                } as React.CSSProperties)
                : undefined
            }
          />
        )}

        {hasBannerImage && (
          <div
            className="absolute inset-x-0 bottom-0 h-full backdrop-blur-md scrim-gradient-mask-strong"
          />
        )}

        <div
          className="absolute inset-x-0 bottom-0 h-full scrim-gradient-overlay-strong"
        />
      </div>

      <div
        className={clsx(
          'absolute inset-x-0 bottom-0 z-10 flex justify-center overflow-visible',
          isPreview ? 'px-4 pb-3' : 'px-3 pb-[clamp(0.25rem,1svw,0.75rem)] md:px-12',
        )}
      >
        <div
          className="w-full min-w-0 max-w-screen-md"
        >
          <ProfileHeaderRow
            profile={profile}
            hideSocialLinks={hideSocialLinks}
            variant={variant}
          />
          {!hideSocialLinks && (
            <ProfileMobileLinks
              profile={profile}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Matches the hero overlay content column (max-w-screen-md + page padding) */
export function ProfileMdContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx('flex justify-center px-3 md:px-12', className)}
    >
      <div
        className="w-full min-w-0 max-w-screen-md"
      >
        {children}
      </div>
    </div>
  );
}

export function ProfileBackToProfileLink({ profileNickname }: { profileNickname: string }) {
  return (
    <ProfileMdContent
      className={clsx(profileHeroMobileGapClassName, 'sm:pt-0 pb-4')}
    >
      <ArrowLink
        href={`/@${encodeURIComponent(profileNickname)}`}
        direction="left"
      >
        Back to profile
      </ArrowLink>
    </ProfileMdContent>
  );
}

export function ProfileBelowHeroSection({ children }: { children?: ReactNode }) {
  if (!children) {
    return null;
  }

  return (
    <div
      className="mb-2 sm:mb-3"
    >
      {children}
    </div>
  );
}
