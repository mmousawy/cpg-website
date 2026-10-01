export type PhotoGridStyle = 'justified' | 'square';
export type PhotoGridDensity = 'comfortable' | 'compact';

/** Photos shown in homepage / gallery section previews */
export const PHOTO_SECTION_LIMIT_COMFORTABLE = 10;
export const PHOTO_SECTION_LIMIT_COMPACT = 16;
/** Server fetch size for section grids (compact maximum) */
export const PHOTO_SECTION_FETCH_LIMIT = PHOTO_SECTION_LIMIT_COMPACT;

export const PHOTO_PAGE_SIZE_COMFORTABLE = 20;
export const PHOTO_PAGE_SIZE_COMPACT = 32;
/** Server prefetch for paginated photo pages (compact page + hasMore probe) */
export const PHOTO_PAGE_PREFETCH_LIMIT = PHOTO_PAGE_SIZE_COMPACT + 1;

export function getPhotoSectionLimit(density: PhotoGridDensity): number {
  return density === 'compact' ? PHOTO_SECTION_LIMIT_COMPACT : PHOTO_SECTION_LIMIT_COMFORTABLE;
}

/** Profile page photostream preview (/@nickname) */
export const PROFILE_PHOTOSTREAM_LIMIT_COMFORTABLE = 20;
export const PROFILE_PHOTOSTREAM_LIMIT_COMPACT = 24;
export const PROFILE_PHOTOSTREAM_FETCH_LIMIT = PROFILE_PHOTOSTREAM_LIMIT_COMPACT;

export function getProfilePhotostreamLimit(density: PhotoGridDensity): number {
  return density === 'compact'
    ? PROFILE_PHOTOSTREAM_LIMIT_COMPACT
    : PROFILE_PHOTOSTREAM_LIMIT_COMFORTABLE;
}

export type PhotoGridSectionLimits = {
  comfortable: number;
  compact: number;
};

export function getPhotoGridLimitForDensity(
  density: PhotoGridDensity,
  limits?: PhotoGridSectionLimits,
): number {
  if (limits) {
    return density === 'compact' ? limits.compact : limits.comfortable;
  }
  return getPhotoSectionLimit(density);
}

export function getPhotoPageSize(density: PhotoGridDensity): number {
  return density === 'compact' ? PHOTO_PAGE_SIZE_COMPACT : PHOTO_PAGE_SIZE_COMFORTABLE;
}
export type PhotoCaptionsMode = 'hover' | 'always';
export type MotionPreference = 'system' | 'reduce';

export const DISPLAY_PREF_STORAGE_KEYS = {
  photoGridStyle: 'photo-grid-style',
  photoGridDensity: 'photo-grid-density',
  photoCaptions: 'photo-captions',
  motion: 'motion-preference',
} as const;

const PHOTO_GRID_STYLES: PhotoGridStyle[] = ['justified', 'square'];
const PHOTO_GRID_DENSITIES: PhotoGridDensity[] = ['comfortable', 'compact'];
const PHOTO_CAPTIONS: PhotoCaptionsMode[] = ['hover', 'always'];
const MOTION_PREFS: MotionPreference[] = ['system', 'reduce'];

export function parsePhotoGridStyle(value: string | null | undefined): PhotoGridStyle | null {
  if (value === 'justified' || value === 'square') return value;
  return null;
}

export function parsePhotoGridDensity(value: string | null | undefined): PhotoGridDensity | null {
  if (value === 'comfortable' || value === 'compact') return value;
  return null;
}

export function parsePhotoCaptionsMode(value: string | null | undefined): PhotoCaptionsMode | null {
  if (value === 'hover' || value === 'always') return value;
  return null;
}

export function parseMotionPreference(value: string | null | undefined): MotionPreference | null {
  if (value === 'system' || value === 'reduce') return value;
  return null;
}

function parseStored<T extends string>(
  key: string,
  allowed: readonly T[],
): T | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(key);
  return (allowed as readonly string[]).includes(stored ?? '') ? (stored as T) : null;
}

export function getStoredPhotoGridStyle(): PhotoGridStyle | null {
  return parseStored(DISPLAY_PREF_STORAGE_KEYS.photoGridStyle, PHOTO_GRID_STYLES);
}

export function getStoredPhotoGridDensity(): PhotoGridDensity | null {
  return parseStored(DISPLAY_PREF_STORAGE_KEYS.photoGridDensity, PHOTO_GRID_DENSITIES);
}

export function getStoredPhotoCaptionsMode(): PhotoCaptionsMode | null {
  return parseStored(DISPLAY_PREF_STORAGE_KEYS.photoCaptions, PHOTO_CAPTIONS);
}

export function getStoredMotionPreference(): MotionPreference | null {
  return parseStored(DISPLAY_PREF_STORAGE_KEYS.motion, MOTION_PREFS);
}

export function subscribeToDisplayPreferenceStorage(callback: () => void) {
  const onChange = () => callback();
  window.addEventListener('storage', onChange);
  window.addEventListener('display-preferences-changed', onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener('display-preferences-changed', onChange);
  };
}

export function persistDisplayPreferencesToLocalStorage(prefs: {
  photoGridStyle: PhotoGridStyle;
  photoGridDensity: PhotoGridDensity;
  photoCaptions: PhotoCaptionsMode;
  motion: MotionPreference;
}) {
  localStorage.setItem(DISPLAY_PREF_STORAGE_KEYS.photoGridStyle, prefs.photoGridStyle);
  localStorage.setItem(DISPLAY_PREF_STORAGE_KEYS.photoGridDensity, prefs.photoGridDensity);
  localStorage.setItem(DISPLAY_PREF_STORAGE_KEYS.photoCaptions, prefs.photoCaptions);
  localStorage.setItem(DISPLAY_PREF_STORAGE_KEYS.motion, prefs.motion);
  window.dispatchEvent(new Event('display-preferences-changed'));
}

export function resolvePhotoGridStyle(
  override: PhotoGridStyle | undefined,
  stored: PhotoGridStyle | null,
  profile: PhotoGridStyle | null,
): PhotoGridStyle {
  return override ?? stored ?? profile ?? 'justified';
}

export function resolvePhotoGridDensity(
  override: PhotoGridDensity | undefined,
  stored: PhotoGridDensity | null,
  profile: PhotoGridDensity | null,
): PhotoGridDensity {
  return override ?? stored ?? profile ?? 'comfortable';
}

export function resolvePhotoCaptionsMode(
  override: PhotoCaptionsMode | undefined,
  stored: PhotoCaptionsMode | null,
  profile: PhotoCaptionsMode | null,
): PhotoCaptionsMode {
  return override ?? stored ?? profile ?? 'hover';
}

export function resolveMotionPreference(
  override: MotionPreference | undefined,
  stored: MotionPreference | null,
  profile: MotionPreference | null,
): MotionPreference {
  return override ?? stored ?? profile ?? 'system';
}

export type JustifiedDensityLayout = {
  maxRowHeight: number;
  targetRowHeightMobile: number;
  targetRowHeightTablet: number;
  targetRowHeightDesktop: number;
};

export function getJustifiedDensityLayout(
  density: PhotoGridDensity,
  maxRowHeightOverride?: number,
): JustifiedDensityLayout {
  if (maxRowHeightOverride !== undefined) {
    return {
      maxRowHeight: maxRowHeightOverride,
      targetRowHeightMobile: 180,
      targetRowHeightTablet: 220,
      targetRowHeightDesktop: 280,
    };
  }
  if (density === 'compact') {
    return {
      maxRowHeight: 220,
      targetRowHeightMobile: 120,
      targetRowHeightTablet: 150,
      targetRowHeightDesktop: 190,
    };
  }
  return {
    maxRowHeight: 350,
    targetRowHeightMobile: 180,
    targetRowHeightTablet: 220,
    targetRowHeightDesktop: 280,
  };
}

export function getSquareGridClassName(density: PhotoGridDensity): string {
  if (density === 'compact') {
    return 'grid w-full grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-1 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:gap-2';
  }
  return 'grid w-full grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-2';
}
