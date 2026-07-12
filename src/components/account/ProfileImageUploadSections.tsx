'use client';

import clsx from 'clsx';
import { useMemo } from 'react';

import Avatar from '@/components/auth/Avatar';
import { ProfileHeroBanner, type ProfileHeaderProfile } from '@/components/profile/ProfileHeader';
import BlurImage from '@/components/shared/BlurImage';
import Button from '@/components/shared/Button';
import { getProfileBannerColors } from '@/utils/profileBannerColor';
import TrashSVG from 'public/icons/trash.svg';

const iconDeleteButtonClassName = '!size-8 shrink-0 !gap-0 !p-0';

export interface ProfileImageUploadSectionsProps {
  profileId?: string;
  nickname: string | null;
  fullName: string | null;
  displayBannerUrl: string | null;
  displayBannerBlurhash: string | null;
  displayAvatarUrl: string | null;
  savedBannerUrl: string | null;
  savedAvatarUrl: string | null;
  pendingBannerFile: File | null;
  pendingAvatarFile: File | null;
  pendingBannerRemove: boolean;
  pendingAvatarRemove: boolean;
  hasBannerChanges: boolean;
  hasAvatarChanges: boolean;
  bannerError: string | null;
  avatarError: string | null;
  isSaving: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;
  handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveBanner: () => void;
  handleCancelBannerChange: () => void;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAvatar: () => void;
  handleCancelAvatarChange: () => void;
  /** Tighter hero for standalone forms (e.g. onboarding) */
  heroVariant?: 'account' | 'standalone';
  showOptionalLabels?: boolean;
}

export default function ProfileImageUploadSections({
  profileId = '',
  nickname,
  fullName,
  displayBannerUrl,
  displayBannerBlurhash,
  displayAvatarUrl,
  savedBannerUrl,
  savedAvatarUrl,
  pendingBannerFile,
  pendingAvatarFile,
  pendingBannerRemove,
  pendingAvatarRemove,
  hasBannerChanges,
  hasAvatarChanges,
  bannerError,
  avatarError,
  isSaving,
  fileInputRef,
  bannerInputRef,
  handleBannerUpload,
  handleRemoveBanner,
  handleCancelBannerChange,
  handleAvatarUpload,
  handleRemoveAvatar,
  handleCancelAvatarChange,
  heroVariant = 'account',
  showOptionalLabels = false,
}: ProfileImageUploadSectionsProps) {
  const previewProfile = useMemo((): ProfileHeaderProfile => ({
    id: profileId,
    nickname,
    full_name: fullName,
    avatar_url: displayAvatarUrl,
    banner_url: displayBannerUrl,
    banner_blurhash: displayBannerBlurhash,
    website: null,
    social_links: [],
  }), [
    profileId,
    nickname,
    fullName,
    displayAvatarUrl,
    displayBannerUrl,
    displayBannerBlurhash,
  ]);

  const hasBannerImage = !!displayBannerUrl;
  const isLocalBanner = displayBannerUrl?.startsWith('blob:') || displayBannerUrl?.startsWith('data:');
  const solidBannerColors = nickname
    ? getProfileBannerColors(nickname)
    : undefined;

  const showRemoveAvatar = (savedAvatarUrl || pendingAvatarFile) && !pendingAvatarRemove;
  const showRemoveBanner = (savedBannerUrl || pendingBannerFile) && !pendingBannerRemove;

  return (
    <div
      className={clsx(
        heroVariant === 'account' && 'border-border-color mb-6 border-b pb-4 sm:pb-6',
        heroVariant === 'standalone' && 'space-y-3',
      )}
    >
      <div
        className={clsx(
          'overflow-hidden border border-border-color',
          heroVariant === 'account' && 'rounded-xl',
          heroVariant === 'standalone' && 'rounded-t-xl border-x-0 border-t-0 border-b',
          heroVariant === 'account' && 'relative -mx-4 -mt-4 mb-4 sm:-mx-6 sm:-mt-6 sm:mb-6 border-b',
          heroVariant === 'standalone' && 'relative -mx-4 -mt-4 mb-4 sm:-mx-6 sm:-mt-6 sm:mb-6',
        )}
      >
        <ProfileHeroBanner
          profile={previewProfile}
          hideSocialLinks
          variant="preview"
        />
      </div>

      <div
        className="space-y-3"
      >
        {/* Banner */}
        <section
          className={clsx(
            'rounded-xl border p-3 transition-colors',
            pendingBannerFile ? 'border-primary' : 'border-border-color',
          )}
        >
          <div
            className="flex items-center gap-3"
          >
            <div
              className={clsx(
                'relative size-[68px] shrink-0 overflow-hidden rounded-md border-2 bg-background-light transition-colors',
                pendingBannerFile ? 'border-primary' : 'border-border-color',
              )}
            >
              {hasBannerImage ? (
                <BlurImage
                  src={displayBannerUrl}
                  alt={`Banner preview for @${nickname || 'profile'}`}
                  fill
                  className="object-cover"
                  sizes="204px"
                  quality={92}
                  blurhashWidth={64}
                  blurhashHeight={64}
                  blurhash={displayBannerBlurhash}
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
            </div>
            <div
              className="flex min-w-0 flex-1 flex-col gap-1.5"
            >
              <p
                className="text-sm font-medium"
              >
                Banner image
                {showOptionalLabels && (
                  <span
                    className="ml-1.5 text-xs font-normal text-foreground/50"
                  >
                    (optional)
                  </span>
                )}
              </p>
              <div
                className="flex flex-wrap gap-2"
              >
                <Button
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={isSaving}
                  variant="secondary"
                  type="button"
                  size="sm"
                >
                  {pendingBannerFile ? 'Choose different' : 'Upload new'}
                </Button>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleBannerUpload}
                  className="hidden"
                  disabled={isSaving}
                />
                {showRemoveBanner && (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={handleRemoveBanner}
                    disabled={isSaving}
                    size="sm"
                    aria-label="Remove banner"
                    icon={<TrashSVG
                      className="size-4"
                    />}
                    className={iconDeleteButtonClassName}
                  >
                    <span
                      className="sr-only"
                    >
                      Remove
                    </span>
                  </Button>
                )}
                {hasBannerChanges && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCancelBannerChange}
                    disabled={isSaving}
                    size="sm"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              {bannerError && (
                <p
                  className="text-sm text-red-500"
                >
                  {bannerError}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Profile picture */}
        <section
          className={clsx(
            'rounded-xl border p-3 transition-colors',
            pendingAvatarFile ? 'border-primary' : 'border-border-color',
          )}
        >
          <div
            className="flex items-center gap-3"
          >
            <div
              className={clsx(
                'shrink-0 overflow-hidden rounded-full border-2 transition-colors',
                pendingAvatarFile ? 'border-primary' : 'border-border-color',
              )}
            >
              <Avatar
                avatarUrl={displayAvatarUrl}
                fullName={fullName}
                nickname={nickname}
                size="lg"
              />
            </div>
            <div
              className="flex min-w-0 flex-1 flex-col gap-1.5"
            >
              <p
                className="text-sm font-medium"
              >
                Profile picture
                {showOptionalLabels && (
                  <span
                    className="ml-1.5 text-xs font-normal text-foreground/50"
                  >
                    (optional)
                  </span>
                )}
              </p>
              <div
                className="flex flex-wrap gap-2"
              >
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                  variant="secondary"
                  type="button"
                  size="sm"
                >
                  {pendingAvatarFile ? 'Choose different' : 'Upload new'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isSaving}
                />
                {showRemoveAvatar && (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={handleRemoveAvatar}
                    disabled={isSaving}
                    size="sm"
                    aria-label="Remove profile picture"
                    icon={<TrashSVG
                      className="size-4"
                    />}
                    className={iconDeleteButtonClassName}
                  >
                    <span
                      className="sr-only"
                    >
                      Remove
                    </span>
                  </Button>
                )}
                {hasAvatarChanges && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCancelAvatarChange}
                    disabled={isSaving}
                    size="sm"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              {avatarError && (
                <p
                  className="text-sm text-red-500"
                >
                  {avatarError}
                </p>
              )}
            </div>
          </div>
        </section>

        <p
          className="text-xs text-foreground/60"
        >
          JPEG, PNG, GIF, or WebP up to 5 MB.
        </p>
      </div>
    </div>
  );
}
