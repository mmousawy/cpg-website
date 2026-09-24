'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import AccountStatsSection from '@/components/account/AccountStatsSection';
import ChangeEmailModal from '@/components/account/ChangeEmailModal';
import ChangeNicknameModal from '@/components/account/ChangeNicknameModal';
import CopyrightSettingsSection from '@/components/account/CopyrightSettingsSection';
import EmailPreferencesSection from '@/components/account/EmailPreferencesSection';
import DeleteAccountSection from '@/components/account/DeleteAccountSection';
import PreferencesSection from '@/components/account/PreferencesSection';
import ProfileSection from '@/components/account/ProfileSection';
import PublicProfileSection from '@/components/account/PublicProfileSection';
import PageContainer from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';
import MobileStickyChromeStack from '@/components/layout/MobileStickyChromeStack';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import SectionMobileNav from '@/components/shared/SectionMobileNav';
import SectionSidebar from '@/components/shared/SectionSidebar';
import StickyActionBar from '@/components/shared/StickyActionBar';
import SuccessMessage from '@/components/shared/SuccessMessage';
import { SectionScrollProvider } from '@/context/SectionScrollContext';
import { useAccountForm } from '@/hooks/useAccountForm';
import { Suspense, useContext } from 'react';

const ACCOUNT_SECTIONS = [
  { id: 'basic-info', title: 'Basic info' },
  { id: 'public-profile', title: 'Public profile' },
  { id: 'appearance', title: 'Appearance' },
  { id: 'email', title: 'Email preferences' },
  { id: 'copyright', title: 'Copyright & licensing' },
  { id: 'account-info', title: 'Account info' },
  { id: 'danger-zone', title: 'Danger zone' },
];

function AccountPageContent() {
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
    bannerError,
    themeMounted,
    emailTypes,
    stats,
    emailChangedFromUrl,
    nicknameChangedFromUrl,
    nicknameChangeCooldownEnd,

    // Avatar
    fileInputRef,
    bannerInputRef,
    displayAvatarUrl,
    displayBannerUrl,
    displayBannerBlurhash,
    hasAvatarChanges,
    hasBannerChanges,
    handleAvatarUpload,
    handleRemoveAvatar,
    handleCancelAvatarChange,
    handleBannerUpload,
    handleRemoveBanner,
    handleCancelBannerChange,
    savedAvatarUrl,
    savedBannerUrl,
    pendingAvatarFile,
    pendingBannerFile,
    pendingAvatarRemove,
    pendingBannerRemove,

    // Theme
    resolvedTheme,

    // Form changes
    hasChanges,
    changeCount,

    // User
    user,
  } = useAccountForm();

  const fullName = watch('fullName');
  const modalContext = useContext(ModalContext);

  const openEmailModal = () => {
    modalContext.setSize('default');
    modalContext.setTitle('Change email address');
    modalContext.setFooter(null);
    modalContext.setContent(
      <ChangeEmailModal
        key={Date.now()}
        currentEmail={profile?.email || user?.email || ''}
        onSuccess={() => {}}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const openNicknameModal = () => {
    if (!user?.id || !nickname) return;

    modalContext.setSize('default');
    modalContext.setTitle('Change nickname');
    modalContext.setFooter(null);
    modalContext.setContent(
      <ChangeNicknameModal
        key={Date.now()}
        currentNickname={nickname}
        currentEmail={profile?.email || user?.email || ''}
        userId={user.id}
        onSuccess={() => {}}
      />,
    );
    modalContext.setIsOpen(true);
  };

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
            className="text-foreground/80"
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
        <PageHeading
          title="Account settings"
          description="Manage your profile information and preferences"
        />

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
              className="text-foreground/80"
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
                    emailChangedFromUrl={emailChangedFromUrl}
                    nicknameChangedFromUrl={nicknameChangedFromUrl}
                    nicknameChangeCooldownEnd={nicknameChangeCooldownEnd}
                    onOpenEmailModal={openEmailModal}
                    onOpenNicknameModal={openNicknameModal}
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
                    profileId={profile?.id ?? ''}
                    nickname={nickname || profile?.nickname || null}
                    fullName={fullName || user?.email || profile?.full_name || null}
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
                    fileInputRef={fileInputRef}
                    bannerInputRef={bannerInputRef}
                    handleBannerUpload={handleBannerUpload}
                    handleRemoveBanner={handleRemoveBanner}
                    handleCancelBannerChange={handleCancelBannerChange}
                    handleAvatarUpload={handleAvatarUpload}
                    handleRemoveAvatar={handleRemoveAvatar}
                    handleCancelAvatarChange={handleCancelAvatarChange}
                  />
                </section>

                <section
                  id="appearance"
                  className="-scroll-mt-4"
                >
                  <PreferencesSection
                    control={control}
                    themeMounted={themeMounted}
                  />
                </section>

                <section
                  id="email"
                  className="-scroll-mt-4"
                >
                  <EmailPreferencesSection
                    control={control}
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

              <section
                id="danger-zone"
                className="-scroll-mt-4"
              >
                <DeleteAccountSection
                  stats={stats}
                />
              </section>
            </div>
          </div>
        )}
      </PageContainer>

      {/* Mobile: section nav slides out before the save bar slides in */}
      <MobileStickyChromeStack
        hidden={isLoading}
        showAction={changeCount > 0}
        nav={(
          <SectionMobileNav
            sections={ACCOUNT_SECTIONS}
            ariaLabel="Account sections"
            sticky={false}
          />
        )}
        action={(
          <StickyActionBar
            constrainWidth
            sticky={false}
          >
            {actionBarContent}
          </StickyActionBar>
        )}
      />

      {/* Desktop: save button only */}
      {changeCount > 0 && (
        <StickyActionBar
          constrainWidth
          className="hidden md:block"
        >
          {actionBarContent}
        </StickyActionBar>
      )}

    </SectionScrollProvider>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={(
        <PageContainer>
          <div
            className="js-loading"
          >
            <LoadingSpinner
              centered
            />
          </div>
        </PageContainer>
      )}
    >
      <AccountPageContent />
    </Suspense>
  );
}
