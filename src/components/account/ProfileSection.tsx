'use client';

import { useMemo } from 'react';
import { UseFormRegister } from 'react-hook-form';

import Container from '@/components/layout/Container';
import { ProfileHeroBanner, type ProfileHeaderProfile } from '@/components/profile/ProfileHeader';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import SuccessMessage from '@/components/shared/SuccessMessage';
import type { AccountFormData, Profile } from '@/hooks/useAccountForm';

interface ProfileSectionProps {
  register: UseFormRegister<AccountFormData>;
  profile: Profile | null;
  userEmail: string | null | undefined;
  nickname: string;
  displayBannerUrl: string | null;
  displayBannerBlurhash: string | null;
  displayAvatarUrl: string | null;
  hasBannerChanges: boolean;
  hasAvatarChanges: boolean;
  bannerError: string | null;
  avatarError: string | null;
  isSaving: boolean;
  emailChangedFromUrl: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;
  handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveBanner: () => void;
  handleCancelBannerChange: () => void;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAvatar: () => void;
  handleCancelAvatarChange: () => void;
  onOpenEmailModal: () => void;
  fullName: string;
  savedBannerUrl: string | null;
  savedAvatarUrl: string | null;
  pendingBannerFile: File | null;
  pendingAvatarFile: File | null;
  pendingBannerRemove: boolean;
  pendingAvatarRemove: boolean;
}

export default function ProfileSection({
  register,
  profile,
  userEmail,
  nickname,
  displayBannerUrl,
  displayBannerBlurhash,
  displayAvatarUrl,
  hasBannerChanges,
  hasAvatarChanges,
  bannerError,
  avatarError,
  isSaving,
  emailChangedFromUrl,
  fileInputRef,
  bannerInputRef,
  handleBannerUpload,
  handleRemoveBanner,
  handleCancelBannerChange,
  handleAvatarUpload,
  handleRemoveAvatar,
  handleCancelAvatarChange,
  onOpenEmailModal,
  fullName,
  savedBannerUrl,
  savedAvatarUrl,
  pendingBannerFile,
  pendingAvatarFile,
  pendingBannerRemove,
  pendingAvatarRemove,
}: ProfileSectionProps) {
  const previewProfile = useMemo((): ProfileHeaderProfile => ({
    id: profile?.id ?? '',
    nickname: nickname || profile?.nickname || null,
    full_name: fullName || profile?.full_name || null,
    avatar_url: displayAvatarUrl,
    banner_url: displayBannerUrl,
    banner_blurhash: displayBannerBlurhash,
    website: profile?.website ?? null,
    social_links: profile?.social_links ?? [],
  }), [
    profile?.id,
    profile?.nickname,
    profile?.full_name,
    profile?.website,
    profile?.social_links,
    nickname,
    fullName,
    displayAvatarUrl,
    displayBannerUrl,
    displayBannerBlurhash,
  ]);

  return (
    <div>
      <h2
        className="mb-4 text-lg font-semibold font-heading opacity-70"
      >
        Basic info
      </h2>
      <Container>
        {/* Profile Header Preview */}
        <div
          className="border-border-color mb-6 border-b pb-4 sm:pb-6"
        >
          <div
            className="relative -mx-4 -mt-4 overflow-hidden rounded-t-xl border-b border-border-color sm:-mx-6 sm:-mt-6"
          >
            <ProfileHeroBanner
              profile={previewProfile}
              hideSocialLinks
              variant="preview"
            />
          </div>

          <div
            className="space-y-2 pt-4 sm:pt-6"
          >
            <div
              className="grid gap-5 sm:grid-cols-2"
            >
              <div
                className="space-y-2"
              >
                <p
                  className="text-sm font-medium"
                >
                  Profile picture
                </p>
                <div
                  className="flex flex-wrap gap-2"
                >
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                    variant="secondary"
                    type="button"
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
                  {(savedAvatarUrl || pendingAvatarFile) && !pendingAvatarRemove && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleRemoveAvatar}
                      disabled={isSaving}
                    >
                      Remove
                    </Button>
                  )}
                  {hasAvatarChanges && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCancelAvatarChange}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                {avatarError && <p
                  className="text-sm text-red-500"
                >{avatarError}</p>}
              </div>

              <div
                className="space-y-2"
              >
                <p
                  className="text-sm font-medium"
                >
                  Banner image
                </p>
                <div
                  className="flex flex-wrap gap-2"
                >
                  <Button
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={isSaving}
                    variant="secondary"
                    type="button"
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
                  {(savedBannerUrl || pendingBannerFile) && !pendingBannerRemove && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleRemoveBanner}
                      disabled={isSaving}
                    >
                      Remove
                    </Button>
                  )}
                  {hasBannerChanges && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCancelBannerChange}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                {bannerError && <p
                  className="text-sm text-red-500"
                >{bannerError}</p>}
              </div>
            </div>
            <p
              className="text-xs text-foreground/60"
            >
              JPEG, PNG, GIF, or WebP up to 5 MB.
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div
          className="space-y-4"
        >
          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="email"
              className="text-sm font-medium"
            >
              Email
            </label>
            {emailChangedFromUrl && (
              <SuccessMessage
                variant="compact"
              >
                Your email has been successfully changed!
              </SuccessMessage>
            )}
            <div
              className="flex gap-2"
            >
              <Input
                id="email"
                type="email"
                value={profile?.email || userEmail || ''}
                disabled
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={onOpenEmailModal}
              >
                Change
              </Button>
            </div>
          </div>

          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="fullName"
              className="text-sm font-medium"
            >
              Full name
            </label>
            <Input
              id="fullName"
              type="text"
              {...register('fullName')}
              placeholder="Your full name"
            />
          </div>

          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="nickname"
              className="text-sm font-medium"
            >
              Nickname (username)
            </label>
            <Input
              id="nickname"
              type="text"
              value={nickname}
              disabled
            />
            <p
              className="text-foreground/50 text-xs"
            >
              Your nickname is used in your profile and gallery URLs and cannot be changed.
              <br />
              URL:
              {' '}
              <span
                className="wrap-break-word"
              >
                {(() => {
                  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
                  const url = `${baseUrl}/@${nickname || 'your-nickname'}`;
                  return url;
                })()}
              </span>
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
