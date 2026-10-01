'use client';

import { useAuth } from '@/hooks/useAuth';
import {
  getStoredMotionPreference,
  getStoredPhotoCaptionsMode,
  getStoredPhotoGridDensity,
  getStoredPhotoGridStyle,
  parseMotionPreference,
  parsePhotoCaptionsMode,
  parsePhotoGridDensity,
  parsePhotoGridStyle,
  resolveMotionPreference,
  resolvePhotoCaptionsMode,
  resolvePhotoGridDensity,
  resolvePhotoGridStyle,
  subscribeToDisplayPreferenceStorage,
  type MotionPreference,
  type PhotoCaptionsMode,
  type PhotoGridDensity,
  type PhotoGridStyle,
} from '@/utils/displayPreferences';
import { useSyncExternalStore } from 'react';

function useStoredPreference<T>(getSnapshot: () => T | null): T | null {
  return useSyncExternalStore(
    subscribeToDisplayPreferenceStorage,
    getSnapshot,
    () => null,
  );
}

export function useEffectivePhotoGridStyle(override?: PhotoGridStyle): PhotoGridStyle {
  const { profile } = useAuth();
  const stored = useStoredPreference(getStoredPhotoGridStyle);
  const profileValue = parsePhotoGridStyle(profile?.photo_grid_style);
  return resolvePhotoGridStyle(override, stored, profileValue);
}

export function useEffectivePhotoGridDensity(override?: PhotoGridDensity): PhotoGridDensity {
  const { profile } = useAuth();
  const stored = useStoredPreference(getStoredPhotoGridDensity);
  const profileValue = parsePhotoGridDensity(profile?.photo_grid_density);
  return resolvePhotoGridDensity(override, stored, profileValue);
}

export function useEffectivePhotoCaptionsMode(override?: PhotoCaptionsMode): PhotoCaptionsMode {
  const { profile } = useAuth();
  const stored = useStoredPreference(getStoredPhotoCaptionsMode);
  const profileValue = parsePhotoCaptionsMode(profile?.photo_captions);
  return resolvePhotoCaptionsMode(override, stored, profileValue);
}

export function useEffectiveMotionPreference(override?: MotionPreference): MotionPreference {
  const { profile } = useAuth();
  const stored = useStoredPreference(getStoredMotionPreference);
  const profileValue = parseMotionPreference(profile?.motion);
  return resolveMotionPreference(override, stored, profileValue);
}
