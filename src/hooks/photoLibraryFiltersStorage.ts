import {
  EMPTY_PHOTO_LIBRARY_FILTERS,
  isPhotoLibraryDefaultState,
  PHOTO_LIBRARY_CHALLENGE_STATUS_OPTIONS,
  PHOTO_LIBRARY_SORT_OPTIONS,
  PHOTO_LIBRARY_UPLOADED_OPTIONS,
  type PhotoLibraryChallengeStatus,
  type PhotoLibraryFilters,
  type PhotoLibraryMetaFilters,
  type PhotoLibrarySort,
  type PhotoLibraryUploadedPreset,
} from '@/hooks/photoLibraryFilters';
import type { PhotoFilter } from '@/hooks/photoQueryCache';
import { LICENSE_ORDER, type LicenseType } from '@/utils/licenses';

const STORAGE_KEY_PREFIX = 'manage-photo-library-filters';

export function photoLibraryFiltersStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

function isPhotoFilter(value: unknown): value is PhotoFilter {
  return value === 'all' || value === 'public' || value === 'private';
}

function isPhotoLibrarySort(value: unknown): value is PhotoLibrarySort {
  return PHOTO_LIBRARY_SORT_OPTIONS.some((option) => option.value === value);
}

function isUploadedPreset(value: unknown): value is PhotoLibraryUploadedPreset {
  return PHOTO_LIBRARY_UPLOADED_OPTIONS.some((option) => option.value === value);
}

function isChallengeStatus(value: unknown): value is PhotoLibraryChallengeStatus {
  return PHOTO_LIBRARY_CHALLENGE_STATUS_OPTIONS.some((option) => option.value === value);
}

function isLicenseType(value: unknown): value is LicenseType {
  return typeof value === 'string' && (LICENSE_ORDER as readonly string[]).includes(value);
}

function parseNullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return null;
  return value;
}

function parseMetaFilters(raw: unknown): PhotoLibraryMetaFilters | null {
  if (!raw || typeof raw !== 'object') return null;
  const meta = raw as Record<string, unknown>;

  const license = meta.license;
  const uploaded = meta.uploaded;
  const challengeStatus = meta.challengeStatus;

  return {
    title: parseNullableString(meta.title),
    cameraKey: parseNullableString(meta.cameraKey),
    lens: parseNullableString(meta.lens),
    albumId: parseNullableString(meta.albumId),
    tag: parseNullableString(meta.tag),
    license: license == null ? null : isLicenseType(license) ? license : null,
    uploaded: uploaded == null ? null : isUploadedPreset(uploaded) ? uploaded : null,
    challengeId: parseNullableString(meta.challengeId),
    challengeStatus:
      challengeStatus == null ? null : isChallengeStatus(challengeStatus) ? challengeStatus : null,
  };
}

function parsePhotoLibraryFilters(raw: unknown): PhotoLibraryFilters | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;

  if (!isPhotoFilter(data.visibility)) return null;
  if (!isPhotoLibrarySort(data.sort)) return null;

  const meta = parseMetaFilters(data.meta);
  if (!meta) return null;

  return {
    visibility: data.visibility,
    sort: data.sort,
    meta,
  };
}

export function loadPersistedPhotoLibraryFilters(userId: string): PhotoLibraryFilters {
  if (typeof window === 'undefined') return EMPTY_PHOTO_LIBRARY_FILTERS;

  try {
    const raw = localStorage.getItem(photoLibraryFiltersStorageKey(userId));
    if (!raw) return EMPTY_PHOTO_LIBRARY_FILTERS;
    const parsed = parsePhotoLibraryFilters(JSON.parse(raw));
    return parsed ?? EMPTY_PHOTO_LIBRARY_FILTERS;
  } catch {
    return EMPTY_PHOTO_LIBRARY_FILTERS;
  }
}

export function persistPhotoLibraryFilters(userId: string, filters: PhotoLibraryFilters): void {
  if (typeof window === 'undefined') return;

  try {
    if (isPhotoLibraryDefaultState(filters)) {
      localStorage.removeItem(photoLibraryFiltersStorageKey(userId));
      return;
    }
    localStorage.setItem(photoLibraryFiltersStorageKey(userId), JSON.stringify(filters));
  } catch {
    // ignore quota / private mode
  }
}

export function clearPersistedPhotoLibraryFilters(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(photoLibraryFiltersStorageKey(userId));
  } catch {
    // ignore
  }
}
