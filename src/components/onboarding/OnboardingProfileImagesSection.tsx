'use client';

import ProfileImageUploadSections from '@/components/account/ProfileImageUploadSections';
import Container from '@/components/layout/Container';

interface OnboardingProfileImagesSectionProps {
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
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;
  handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveBanner: () => void;
  handleCancelBannerChange: () => void;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAvatar: () => void;
  handleCancelAvatarChange: () => void;
}

export default function OnboardingProfileImagesSection({
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
  fileInputRef,
  bannerInputRef,
  handleBannerUpload,
  handleRemoveBanner,
  handleCancelBannerChange,
  handleAvatarUpload,
  handleRemoveAvatar,
  handleCancelAvatarChange,
}: OnboardingProfileImagesSectionProps) {
  return (
    <div>
      <h2
        className="mb-4 text-lg font-semibold opacity-70 font-heading"
      >
        Profile images
      </h2>
      <Container
        className="overflow-hidden"
      >
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
        <p
          className="mt-4 text-xs text-foreground/70"
        >
          You can update your profile picture and banner later in your account settings.
        </p>
      </Container>
    </div>
  );
}
