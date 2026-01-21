'use client';

import AccountStatsSection from '@/components/account/AccountStatsSection';
import ChangeEmailModal from '@/components/account/ChangeEmailModal';
import PreferencesSection from '@/components/account/PreferencesSection';
import ProfileSection from '@/components/account/ProfileSection';
import PublicProfileSection from '@/components/account/PublicProfileSection';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import StickyActionBar from '@/components/shared/StickyActionBar';
import SuccessMessage from '@/components/shared/SuccessMessage';
import { useAccountForm } from '@/hooks/useAccountForm';

export default function AccountPage() {
  const {
    // Form
    form,
    register,
    control,
    handleSubmit,
    watch,
    socialLinksFieldArray,

    // State
    profile,
    nickname,
    isLoading,
    isSaving,
    success,
    submitError,
    avatarError,
    themeMounted,
    emailTypes,
    stats,
    isEmailModalOpen,
    setIsEmailModalOpen,
    emailChangedFromUrl,

    // Avatar
    fileInputRef,
    displayAvatarUrl,
    hasAvatarChanges,
    handleAvatarUpload,
    handleRemoveAvatar,
    handleCancelAvatarChange,
    savedAvatarUrl,
    pendingAvatarFile,
    pendingAvatarRemove,

    // Theme
    resolvedTheme,

    // Form changes
    hasChanges,
    changeCount,

    // User
    user,
  } = useAccountForm();

  const fullName = watch('fullName');

  return (
    <>
      <PageContainer>
        <div
          className="mb-8"
        >
          <h1
            className="mb-2 text-3xl font-bold"
          >
            Account settings
          </h1>
          <p
            className="text-lg opacity-70"
          >
            Manage your profile information and preferences
          </p>
        </div>

        {/* No-JS fallback: show message and hide loading spinner */}
        <noscript>
          <style>
            {'.js-loading { display: none !important; }'}
          </style>
          <div
            className="border-border-color bg-background-light rounded-xl border p-6 text-center"
          >
            <p
              className="mb-2 text-lg font-medium"
            >
              JavaScript required
            </p>
            <p
              className="text-foreground/70"
            >
              This page requires JavaScript to manage your account settings. Please enable
              JavaScript in your browser to continue.
            </p>
          </div>
        </noscript>

        {isLoading ? (
          <div
            className="js-loading"
          >
            <LoadingSpinner
              centered
            />
          </div>
        ) : (
          <div
            className="space-y-8"
          >
            <form
              id="account-form"
              onSubmit={handleSubmit}
            >
              <ProfileSection
                register={register}
                profile={profile}
                userEmail={user?.email}
                nickname={nickname}
                displayAvatarUrl={displayAvatarUrl}
                hasAvatarChanges={hasAvatarChanges}
                avatarError={avatarError}
                isSaving={isSaving}
                emailChangedFromUrl={emailChangedFromUrl}
                fileInputRef={fileInputRef}
                handleAvatarUpload={handleAvatarUpload}
                handleRemoveAvatar={handleRemoveAvatar}
                handleCancelAvatarChange={handleCancelAvatarChange}
                onOpenEmailModal={() => setIsEmailModalOpen(true)}
                fullName={fullName || user?.email || ''}
                savedAvatarUrl={savedAvatarUrl}
                pendingAvatarFile={pendingAvatarFile}
                pendingAvatarRemove={pendingAvatarRemove}
              />

              <PublicProfileSection
                register={register}
                control={control}
                socialLinksFieldArray={socialLinksFieldArray}
                isSaving={isSaving}
              />

              <PreferencesSection
                control={control}
                themeMounted={themeMounted}
                resolvedTheme={resolvedTheme}
                emailTypes={emailTypes}
                watch={watch}
                setValue={form.setValue}
              />
            </form>

            <AccountStatsSection
              profile={profile}
              stats={stats}
            />
          </div>
        )}
      </PageContainer>

      {/* Sticky Save Button */}
      {changeCount > 0 && (
        <StickyActionBar
          constrainWidth
        >
          <div
            className="flex items-center gap-3 text-sm"
          >
            {submitError && (
              <ErrorMessage
                variant="compact"
                className="py-1.5 text-sm"
              >
                {submitError}
              </ErrorMessage>
            )}
            {success && (
              <SuccessMessage
                variant="compact"
                className="py-1.5 text-sm"
              >
                Profile updated!
              </SuccessMessage>
            )}
            {!submitError && !success && hasChanges && (
              <span
                className="text-foreground/70"
              >
                {changeCount}
                {' '}
                unsaved
                {' '}
                {changeCount === 1 ? 'change' : 'changes'}
              </span>
            )}
          </div>
          <Button
            type="submit"
            form="account-form"
            disabled={isSaving || !hasChanges}
            loading={isSaving}
          >
            Save changes
          </Button>
        </StickyActionBar>
      )}

      {/* Email Change Modal */}
      <ChangeEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        currentEmail={profile?.email || user?.email || ''}
        onSuccess={() => {
          // Optionally refresh profile after email change initiated
        }}
      />
    </>
  );
}
