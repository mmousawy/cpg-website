'use client';

import { useCallback, useEffect, useState } from 'react';
import { FormProvider } from 'react-hook-form';

import GearAccountPanel from '@/components/gear/GearAccountPanel';
import GearPageClient, { type GearInventoryActions } from '@/components/gear/GearPageClient';
import GearShootingPreferences from '@/components/gear/GearShootingPreferences';
import PageContainer from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import StickyActionBar from '@/components/shared/StickyActionBar';
import SuccessMessage from '@/components/shared/SuccessMessage';
import { useAuth } from '@/context/AuthContext';
import { useUnsavedChanges } from '@/context/UnsavedChangesContext';
import { useGearAccountForm } from '@/hooks/useGearAccountForm';
import { useGearProfile } from '@/hooks/useGearProfile';
import { useShowGearSampleKit } from '@/lib/gear/sampleKit';
import { saveUserGearProfile } from '@/lib/gear/saveUserGearProfile';
import type { UserGearProfile } from '@/lib/gear/types';

import PlusSVG from 'public/icons/plus.svg';

const GEAR_FORM_ID = 'account-gear-form';

function GearPageLoading() {
  return (
    <PageContainer>
      <PageHeading
        title="My gear"
      />
      <LoadingSpinner
        centered
      />
    </PageContainer>
  );
}

type AccountGearClientProps = {
  serverSaved: UserGearProfile | null;
  serverNickname: string | null;
};

export default function AccountGearClient({
  serverSaved,
  serverNickname,
}: AccountGearClientProps) {
  const { user, profile: authProfile, isLoading: authLoading } = useAuth();
  const nickname = authProfile?.nickname ?? serverNickname;
  const authSettling = authLoading || (Boolean(user) && !authProfile && !serverNickname);
  const serverPrefetched = serverSaved !== null;
  const [inventoryActions, setInventoryActions] = useState<GearInventoryActions | null>(null);
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const showSampleKit = useShowGearSampleKit();
  const gearQueryEnabled = !serverPrefetched && !authSettling && Boolean(nickname);
  const { profile: saved, hydrated, persist: persistFromHook, loadError } = useGearProfile(
    nickname ?? '',
    {
      enabled: gearQueryEnabled,
    },
  );

  const persist = useCallback(
    async (next: UserGearProfile) => {
      if (!nickname) {
        return;
      }
      await saveUserGearProfile(nickname, next);
    },
    [nickname],
  );

  const persistForForm = serverPrefetched ? persist : persistFromHook;

  const {
    form,
    formReady,
    isDirty,
    isSaving,
    saveSuccess,
    saveError,
    handleDiscard,
    onSubmit,
  } = useGearAccountForm({
    saved,
    hydrated,
    persist: persistForForm,
    serverSaved: serverPrefetched ? serverSaved : undefined,
    nicknameForLocalDraft: nickname ?? undefined,
  });

  useEffect(() => {
    setHasUnsavedChanges(isDirty);
    return () => setHasUnsavedChanges(false);
  }, [isDirty, setHasUnsavedChanges]);

  const handleInventoryActions = useCallback((actions: GearInventoryActions) => {
    setInventoryActions(actions);
  }, []);

  const actionBarContent = (
    <>
      <div
        className="flex min-w-0 items-center gap-3 text-sm"
      >
        {saveError && (
          <ErrorMessage
            variant="compact"
            className="py-1.5 text-sm"
          >
            {saveError}
          </ErrorMessage>
        )}
        {saveSuccess && !isDirty && !saveError && (
          <SuccessMessage
            variant="compact"
            className="py-1.5 text-sm"
          >
            Gear saved!
          </SuccessMessage>
        )}
        {!saveError && !saveSuccess && isDirty && (
          <span
            className="text-foreground/80 max-sm:hidden"
          >
            You have unsaved changes
          </span>
        )}
      </div>
      <div
        className="flex shrink-0 flex-wrap items-center justify-end gap-2"
      >
        <Button
          type="button"
          variant="secondary"
          onClick={() => inventoryActions?.openAddModal()}
          icon={(
            <PlusSVG
              className="size-4 -ml-1"
            />
          )}
        >
          Add gear
        </Button>
        <Button
          type="submit"
          form={GEAR_FORM_ID}
          disabled={!isDirty || isSaving}
          loading={isSaving}
        >
          Save
        </Button>
      </div>
    </>
  );

  if (authSettling && !serverPrefetched) {
    return <GearPageLoading />;
  }

  if (!nickname) {
    return (
      <PageContainer>
        <PageHeading
          title="Gear"
        />
        <p
          className="text-foreground/70 text-sm"
        >
          Set a nickname on your account before managing gear.
        </p>
      </PageContainer>
    );
  }

  if (!formReady) {
    return <GearPageLoading />;
  }

  const publicGearHref = `/@${encodeURIComponent(nickname)}/gear`;

  return (
    <FormProvider
      {...form}
    >
      <form
        id={GEAR_FORM_ID}
        onSubmit={onSubmit}
      >
        <PageContainer>
          <PageHeading
            title="My gear"
            description="Manage your shooting preferences and gear inventory."
            mobileHeaderActions={(
              <Button
                href={publicGearHref}
                variant="secondary"
                size="sm"
              >
                View public page
              </Button>
            )}
            actions={(
              <Button
                href={publicGearHref}
                variant="secondary"
                size="sm"
                className="max-sm:hidden"
              >
                View public page
              </Button>
            )}
          />

          {loadError && (
            <ErrorMessage
              className="mb-6"
            >
              {loadError}
            </ErrorMessage>
          )}

          <div
            className="space-y-10"
          >
            <GearAccountPanel
              title="Shooting preferences"
              description="Shown on your public profile when you fill this in."
            >
              <GearShootingPreferences />
            </GearAccountPanel>

            <GearAccountPanel
              title="Inventory"
              description="Cameras, lenses, and other gear visitors can browse on your gear page."
              actions={showSampleKit ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => inventoryActions?.handleSampleKit()}
                >
                  Use sample kit
                </Button>
              ) : undefined}
            >
              <GearPageClient
                profileNickname={nickname}
                mode="account"
                hideAccountToolbar
                useGearForm
                onInventoryActions={handleInventoryActions}
              />
            </GearAccountPanel>
          </div>

          <p
            className="text-foreground/50 mt-4 text-xs max-sm:mb-6"
          >
            Camera and lens names from the Lensfun database (CC BY-SA 3.0).
          </p>
        </PageContainer>
      </form>

      <StickyActionBar
        constrainWidth
        terminal
      >
        {actionBarContent}
      </StickyActionBar>
    </FormProvider>
  );
}
