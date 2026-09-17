'use client';

import AlbumCardStylePicker, { type AlbumCardStyle } from '@/components/account/AlbumCardStylePicker';
import ProfileImageUploadSections from '@/components/account/ProfileImageUploadSections';
import ThemePreferencePicker from '@/components/account/ThemePreferencePicker';
import Container from '@/components/layout/Container';
import type { AppThemeSelection } from '@/hooks/useAppTheme';

interface OnboardingStyleSectionProps {
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
  theme: AppThemeSelection;
  onThemeChange: (theme: AppThemeSelection) => void;
  albumCardStyle: AlbumCardStyle;
  onAlbumCardStyleChange: (style: AlbumCardStyle) => void;
}

export default function OnboardingStyleSection({
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
  theme,
  onThemeChange,
  albumCardStyle,
  onAlbumCardStyleChange,
}: OnboardingStyleSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="onboarding-step-title mb-2 sm:mb-4 text-lg font-semibold opacity-80 font-heading">
          Theme
        </h2>
        <Container className="onboarding-rise-in onboarding-rise-in-delay-1">
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Color scheme</span>
              <ThemePreferencePicker value={theme} onChange={onThemeChange} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Album card style</span>
              <AlbumCardStylePicker value={albumCardStyle} onChange={onAlbumCardStyleChange} />
            </div>
            <p className="text-xs text-foreground/80">
              You can change these preferences anytime in account settings.
            </p>
          </div>
        </Container>
      </div>

      <div>
        <h2 className="onboarding-step-title mb-2 sm:mb-4 text-lg font-semibold opacity-80 font-heading">
          Profile images
        </h2>
        <Container className="onboarding-rise-in onboarding-rise-in-delay-2 overflow-hidden">
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
          <p className="mt-4 text-xs text-foreground/80">
            You can update your profile picture and banner later in your account settings.
          </p>
        </Container>
      </div>
    </div>
  );
}
