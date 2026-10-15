'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { cloneGearProfile, gearProfilesEqual } from '@/lib/gear/gearProfileEqual';
import { userGearProfileSchema } from '@/lib/gear/gearProfileSchema';
import { EMPTY_GEAR_PROFILE, type UserGearProfile } from '@/lib/gear/types';

type UseGearAccountFormOptions = {
  saved: UserGearProfile | null;
  hydrated: boolean;
  persist: (profile: UserGearProfile) => Promise<void>;
  /** Gear loaded on the server for first paint. */
  serverSaved?: UserGearProfile | null;
};

export function useGearAccountForm({
  saved,
  hydrated,
  persist,
  serverSaved,
}: UseGearAccountFormOptions) {
  const savedBaselineRef = useRef<UserGearProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [baselineLoaded, setBaselineLoaded] = useState(false);
  const seededFromServer = serverSaved !== undefined && serverSaved !== null;

  const form = useForm<UserGearProfile>({
    resolver: zodResolver(userGearProfileSchema),
    defaultValues: serverSaved
      ? cloneGearProfile(serverSaved)
      : { ...EMPTY_GEAR_PROFILE },
  });

  const { reset, watch, handleSubmit } = form;
  const values = watch();

  useEffect(() => {
    if (seededFromServer) {
      const baseline = cloneGearProfile(serverSaved);
      savedBaselineRef.current = baseline;
      reset(baseline);
      setBaselineLoaded(true);
      return;
    }

    if (!hydrated || !saved) {
      setBaselineLoaded(false);
      return;
    }
    const baseline = cloneGearProfile(saved);
    savedBaselineRef.current = baseline;
    reset(baseline);
    setBaselineLoaded(true);
  }, [seededFromServer, serverSaved, hydrated, saved, reset]);

  const isDirty = savedBaselineRef.current
    ? !gearProfilesEqual(values, savedBaselineRef.current)
    : false;

  useEffect(() => {
    if (isDirty) {
      setSaveSuccess(false);
    }
  }, [isDirty]);

  useEffect(() => {
    if (!saveSuccess || isDirty) {
      return;
    }
    const timer = window.setTimeout(() => {
      setSaveSuccess(false);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [saveSuccess, isDirty]);

  const handleDiscard = useCallback(() => {
    if (!savedBaselineRef.current) return;
    reset(cloneGearProfile(savedBaselineRef.current));
    setSaveSuccess(false);
    setSaveError(null);
  }, [reset]);

  const onSubmit = handleSubmit(async (data) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await persist(data);
      const next = cloneGearProfile(data);
      savedBaselineRef.current = next;
      reset(next);
      setSaveSuccess(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save gear');
    } finally {
      setIsSaving(false);
    }
  });

  const formReady = baselineLoaded && (seededFromServer || saved !== null);

  return {
    form,
    formReady,
    isDirty,
    isSaving,
    saveSuccess,
    saveError,
    handleDiscard,
    onSubmit,
  };
}
