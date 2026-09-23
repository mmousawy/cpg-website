import {
  getStoredMotionPreference,
  getStoredPhotoCaptionsMode,
  getStoredPhotoGridDensity,
  getStoredPhotoGridStyle,
  parseMotionPreference,
  parsePhotoCaptionsMode,
  parsePhotoGridDensity,
  parsePhotoGridStyle,
  type MotionPreference,
  type PhotoCaptionsMode,
  type PhotoGridDensity,
  type PhotoGridStyle,
} from '@/utils/displayPreferences';

export type ProfileDisplayPreferenceFields = {
  photo_grid_style?: string | null;
  photo_grid_density?: string | null;
  photo_captions?: string | null;
  motion?: string | null;
};

export function readDisplayPreferencesForForm(
  profile: ProfileDisplayPreferenceFields | null | undefined,
): {
  photoGridStyle: PhotoGridStyle;
  photoGridDensity: PhotoGridDensity;
  photoCaptions: PhotoCaptionsMode;
  motion: MotionPreference;
} {
  const storedStyle = getStoredPhotoGridStyle();
  const storedDensity = getStoredPhotoGridDensity();
  const storedCaptions = getStoredPhotoCaptionsMode();
  const storedMotion = getStoredMotionPreference();

  const profileStyle = parsePhotoGridStyle(profile?.photo_grid_style);
  const profileDensity = parsePhotoGridDensity(profile?.photo_grid_density);
  const profileCaptions = parsePhotoCaptionsMode(profile?.photo_captions);
  const profileMotion = parseMotionPreference(profile?.motion);

  return {
    photoGridStyle: storedStyle ?? profileStyle ?? 'justified',
    photoGridDensity: storedDensity ?? profileDensity ?? 'comfortable',
    photoCaptions: storedCaptions ?? profileCaptions ?? 'hover',
    motion: storedMotion ?? profileMotion ?? 'system',
  };
}
