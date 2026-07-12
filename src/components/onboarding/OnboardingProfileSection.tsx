'use client';

import { UseFormRegister, FieldErrors } from 'react-hook-form';

import ProfileImageUploadSections from '@/components/account/ProfileImageUploadSections';
import Input from '@/components/shared/Input';
import Textarea from '@/components/shared/Textarea';
import type { OnboardingFormData } from '@/app/onboarding/OnboardingClient';

interface OnboardingProfileSectionProps {
  register: UseFormRegister<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
  profileId: string;
  nickname: string;
  fullName: string;
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
  isOAuthUser: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;
  handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveBanner: () => void;
  handleCancelBannerChange: () => void;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAvatar: () => void;
  handleCancelAvatarChange: () => void;
}

export default function OnboardingProfileSection({
  register,
  errors,
  profileId,
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
  isOAuthUser,
  fileInputRef,
  bannerInputRef,
  handleBannerUpload,
  handleRemoveBanner,
  handleCancelBannerChange,
  handleAvatarUpload,
  handleRemoveAvatar,
  handleCancelAvatarChange,
}: OnboardingProfileSectionProps) {
  return (
    <>
      <ProfileImageUploadSections
        profileId={profileId}
        nickname={nickname || null}
        fullName={fullName || null}
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
        heroVariant="standalone"
        showOptionalLabels
      />

      {/* Email Field - Only for OAuth users */}
      {isOAuthUser && (
        <div
          className="flex flex-col gap-2"
        >
          <label
            htmlFor="email"
            className="text-sm font-medium"
          >
            Email
            {' '}
            <span
              className="text-red-500"
            >
              *
            </span>
          </label>
          <Input
            id="email"
            type="email"
            {...register('email', { required: isOAuthUser ? 'Email is required' : false })}
            placeholder="you@example.com"
          />
          {errors.email && <p
            className="text-sm text-red-500"
          >
            {errors.email.message}
          </p>}
          <p
            className="text-xs text-foreground/70"
          >
            This email will be used for notifications and account communications.
          </p>
        </div>
      )}

      {/* Full Name Field */}
      <div
        className="flex flex-col gap-2"
      >
        <label
          htmlFor="fullName"
          className="text-sm font-medium"
        >
          Full name
          {' '}
          <span
            className="text-red-500"
          >
            *
          </span>
        </label>
        <Input
          id="fullName"
          type="text"
          {...register('fullName')}
          placeholder="Your full name"
        />
        {errors.fullName && <p
          className="text-sm text-red-500"
        >
          {errors.fullName.message}
        </p>}
      </div>

      {/* Bio Field */}
      <div
        className="flex flex-col gap-2"
      >
        <label
          htmlFor="bio"
          className="text-sm font-medium"
        >
          Bio
          <span
            className="ml-1.5 text-xs font-normal text-foreground/50"
          >
            (optional)
          </span>
        </label>
        <Textarea
          id="bio"
          {...register('bio')}
          placeholder="Tell us about yourself..."
          rows={4}
        />
      </div>
    </>
  );
}
