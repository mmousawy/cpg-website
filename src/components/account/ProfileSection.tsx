'use client';

import { UseFormRegister } from 'react-hook-form';

import Container from '@/components/layout/Container';
import ProfileImageUploadSections from '@/components/account/ProfileImageUploadSections';
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
  return (
    <div>
      <h2
        className="mb-4 text-lg font-semibold font-heading opacity-70"
      >
        Basic info
      </h2>
      <Container>
        <ProfileImageUploadSections
          profileId={profile?.id ?? ''}
          nickname={nickname || profile?.nickname || null}
          fullName={fullName || profile?.full_name || null}
          displayBannerUrl={displayBannerUrl}
          displayBannerBlurhash={displayBannerBlurhash}
          displayAvatarUrl={displayAvatarUrl}
          savedBannerUrl={savedBannerUrl}
          savedAvatarUrl={savedAvatarUrl}
          pendingBannerFile={pendingBannerFile}
          pendingAvatarFile={pendingAvatarFile}
          pendingBannerRemove={pendingBannerRemove}
          pendingAvatarRemove={pendingAvatarRemove}
          hasBannerChanges={hasBannerChanges}
          hasAvatarChanges={hasAvatarChanges}
          bannerError={bannerError}
          avatarError={avatarError}
          isSaving={isSaving}
          fileInputRef={fileInputRef}
          bannerInputRef={bannerInputRef}
          handleBannerUpload={handleBannerUpload}
          handleRemoveBanner={handleRemoveBanner}
          handleCancelBannerChange={handleCancelBannerChange}
          handleAvatarUpload={handleAvatarUpload}
          handleRemoveAvatar={handleRemoveAvatar}
          handleCancelAvatarChange={handleCancelAvatarChange}
          heroVariant="account"
        />

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
