'use client';

import AccountStatsSection from '@/components/account/AccountStatsSection';
import ChangeEmailModal from '@/components/account/ChangeEmailModal';
import CopyrightSettingsSection from '@/components/account/CopyrightSettingsSection';
import PreferencesSection from '@/components/account/PreferencesSection';
import ProfileSection from '@/components/account/ProfileSection';
import PublicProfileSection from '@/components/account/PublicProfileSection';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import SectionMobileNav from '@/components/shared/SectionMobileNav';
import SectionSidebar from '@/components/shared/SectionSidebar';
import StickyActionBar from '@/components/shared/StickyActionBar';
import SuccessMessage from '@/components/shared/SuccessMessage';
import { SectionScrollProvider } from '@/context/SectionScrollContext';
import { useAccountForm } from '@/hooks/useAccountForm';

const ACCOUNT_SECTIONS = [
  { id: 'basic-info', title: 'Basic info' },
  { id: 'public-profile', title: 'Public profile' },
  { id: 'preferences', title: 'Preferences' },
  { id: 'copyright', title: 'Copyright & licensing' },
  { id: 'account-info', title: 'Account info' },
];

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

  const actionBarContent = (
    <>
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
    </>
  );

  return (
    <SectionScrollProvider
      sectionIds={ACCOUNT_SECTIONS.map((s) => s.id)}
    >
      <PageContainer>
        <div
          className="mb-8"
        >
          <h1
            className="mb-2 text-2xl font-bold sm:text-3xl"
          >
            Account settings
          </h1>
          <p
            className="text-base opacity-70 sm:text-lg"
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
            className="flex flex-col md:flex-row md:gap-4 lg:gap-8"
          >
            <SectionSidebar
              sections={ACCOUNT_SECTIONS}
              ariaLabel="Account sections"
            />

            <div
              className="min-w-0 flex-1 space-y-8 text-sm sm:text-base"
            >
              <form
                id="account-form"
                onSubmit={handleSubmit}
                className="space-y-8"
              >
                <section
                  id="basic-info"
                  className="-scroll-mt-4"
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
                </section>

                <section
                  id="public-profile"
                  className="-scroll-mt-4"
                >
                  <PublicProfileSection
                    register={register}
                    control={control}
                    socialLinksFieldArray={socialLinksFieldArray}
                    isSaving={isSaving}
                  />
                </section>

                <section
                  id="preferences"
                  className="-scroll-mt-4"
                >
                  <PreferencesSection
                    control={control}
                    themeMounted={themeMounted}
                    resolvedTheme={resolvedTheme}
                    emailTypes={emailTypes}
                    watch={watch}
                    setValue={form.setValue}
                  />
                </section>

                <section
                  id="copyright"
                  className="-scroll-mt-4"
                >
                  <CopyrightSettingsSection
                    control={control}
                    isSaving={isSaving}
                  />
                </section>
              </form>

              <section
                id="account-info"
                className="-scroll-mt-4"
              >
                <AccountStatsSection
                  profile={profile}
                  stats={stats}
                />
              </section>
            </div>
          </div>
        )}
      </PageContainer>

      {/* Mobile: section nav + action bar stacked so both are visible */}
      <div
        className="md:hidden sticky bottom-0 z-30 flex flex-col"
      >
        <SectionMobileNav
          sections={ACCOUNT_SECTIONS}
          ariaLabel="Account sections"
        />
        {changeCount > 0 && (
          <StickyActionBar
            constrainWidth
            sticky={false}
          >
            {actionBarContent}
          </StickyActionBar>
        )}
      </div>

      {/* Desktop: save button only */}
      {changeCount > 0 && (
        <StickyActionBar
          constrainWidth
          className="hidden md:block"
        >
          {actionBarContent}
        </StickyActionBar>
      )}

      <ChangeEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        currentEmail={profile?.email || user?.email || ''}
        onSuccess={() => {
          // Optionally refresh profile after email change initiated
        }}
      />
    </SectionScrollProvider>
  );
}
