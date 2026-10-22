import type { PhotoFilter } from '@/hooks/photoQueryCache';
import type { LicenseType } from '@/utils/licenses';
import { formatExifData, parseExifData } from '@/utils/exif';

export type PhotoLibraryUploadedPreset = '7d' | '30d' | 'year';

export type PhotoLibraryChallengeStatus = 'accepted' | 'pending' | 'rejected';

export type PhotoLibrarySort =
  | 'manual'
  | 'uploaded_newest'
  | 'uploaded_oldest'
  | 'title_asc'
  | 'title_desc';

export type PhotoLibraryMetaFilters = {
  title: string | null;
  cameraKey: string | null;
  lens: string | null;
  albumId: string | null;
  tag: string | null;
  license: LicenseType | null;
  uploaded: PhotoLibraryUploadedPreset | null;
  challengeId: string | null;
  challengeStatus: PhotoLibraryChallengeStatus | null;
};

export type PhotoLibraryFilters = {
  visibility: PhotoFilter;
  meta: PhotoLibraryMetaFilters;
  sort: PhotoLibrarySort;
};

export const UNTITLED_PHOTO_TITLE = '__untitled__';
export const NOT_IN_ANY_ALBUM = '__not_in_album__';
/** Photos with no usable camera make/model in EXIF. */
export const NO_CAMERA_RECORDED = '__no_camera__';
/** Photos with no lens model in EXIF. */
export const NO_LENS_RECORDED = '__no_lens__';
/** Photos with no tags. */
export const NO_TAGS = '__no_tags__';
/** Photos with no challenge submissions. */
export const NOT_IN_ANY_CHALLENGE = '__not_in_challenge__';

export const PHOTO_LIBRARY_SPECIAL_FILTER_LABELS: Record<string, string> = {
  [UNTITLED_PHOTO_TITLE]: 'Untitled',
  [NOT_IN_ANY_ALBUM]: 'Not in any album',
  [NO_CAMERA_RECORDED]: 'No camera recorded',
  [NO_LENS_RECORDED]: 'No lens recorded',
  [NO_TAGS]: 'No tags',
  [NOT_IN_ANY_CHALLENGE]: 'Not in any challenge',
};

export function getPhotoLibraryFilterLabel(
  value: string,
  options: Array<{ value: string; label: string }>,
): string | null {
  if (!value) return null;
  return PHOTO_LIBRARY_SPECIAL_FILTER_LABELS[value] ?? options.find((o) => o.value === value)?.label ?? null;
}

export const PHOTO_LIBRARY_SORT_OPTIONS: Array<{ value: PhotoLibrarySort; label: string }> = [
  { value: 'manual', label: 'Custom order' },
  { value: 'uploaded_newest', label: 'Uploaded (newest first)' },
  { value: 'uploaded_oldest', label: 'Uploaded (oldest first)' },
  { value: 'title_asc', label: 'Title (A–Z)' },
  { value: 'title_desc', label: 'Title (Z–A)' },
];

export const PHOTO_LIBRARY_UPLOADED_OPTIONS: Array<{ value: PhotoLibraryUploadedPreset; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'year', label: 'This year' },
];

export const PHOTO_LIBRARY_CHALLENGE_STATUS_OPTIONS: Array<{
  value: PhotoLibraryChallengeStatus;
  label: string;
}> = [
  { value: 'accepted', label: 'Accepted' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

/** Value shown in the name filter field. */
export function titleFilterToDisplayValue(title: string | null): string {
  if (title === UNTITLED_PHOTO_TITLE) return 'Untitled';
  return title ?? '';
}

/** Parse free-text name filter input into stored meta.title. */
export function parseTitleFilterInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'untitled') return UNTITLED_PHOTO_TITLE;
  return trimmed;
}

export function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function uploadedPresetToIsoMin(preset: PhotoLibraryUploadedPreset): string {
  const now = new Date();
  if (preset === '7d') {
    now.setDate(now.getDate() - 7);
  } else if (preset === '30d') {
    now.setDate(now.getDate() - 30);
  } else {
    now.setMonth(0, 1);
    now.setHours(0, 0, 0, 0);
  }
  return now.toISOString();
}

export const EMPTY_PHOTO_LIBRARY_META_FILTERS: PhotoLibraryMetaFilters = {
  title: null,
  cameraKey: null,
  lens: null,
  albumId: null,
  tag: null,
  license: null,
  uploaded: null,
  challengeId: null,
  challengeStatus: null,
};

export const EMPTY_PHOTO_LIBRARY_FILTERS: PhotoLibraryFilters = {
  visibility: 'all',
  meta: EMPTY_PHOTO_LIBRARY_META_FILTERS,
  sort: 'manual',
};

const CAMERA_KEY_SEP = '\u001f';
export const CAMERA_DISPLAY_FILTER_PREFIX = '__camera_display__:';

export function encodeCameraDisplayFilterKey(displayLabel: string): string {
  return `${CAMERA_DISPLAY_FILTER_PREFIX}${displayLabel.trim()}`;
}

export function isCameraDisplayFilterKey(key: string): boolean {
  return key.startsWith(CAMERA_DISPLAY_FILTER_PREFIX);
}

export function decodeCameraDisplayFilterKey(key: string): string | null {
  if (!isCameraDisplayFilterKey(key)) return null;
  const label = key.slice(CAMERA_DISPLAY_FILTER_PREFIX.length).trim();
  return label || null;
}

export function encodeCameraFilterKey(make: string, model: string): string {
  return `${make}${CAMERA_KEY_SEP}${model}`;
}

export function decodeCameraFilterKey(key: string): { make: string; model: string } {
  const idx = key.indexOf(CAMERA_KEY_SEP);
  if (idx === -1) return { make: '', model: key };
  return {
    make: key.slice(0, idx),
    model: key.slice(idx + CAMERA_KEY_SEP.length),
  };
}

export function isPhotoLibraryMetaFiltersEmpty(meta: PhotoLibraryMetaFilters): boolean {
  return (
    meta.title === null
    && meta.cameraKey === null
    && meta.lens === null
    && meta.albumId === null
    && meta.tag === null
    && meta.license === null
    && meta.uploaded === null
    && meta.challengeId === null
    && meta.challengeStatus === null
  );
}

export function isPhotoLibraryDefaultState(filters: PhotoLibraryFilters): boolean {
  return (
    filters.visibility === 'all'
    && filters.sort === 'manual'
    && isPhotoLibraryMetaFiltersEmpty(filters.meta)
  );
}

export function isPhotoLibraryFiltersActive(filters: PhotoLibraryFilters): boolean {
  return filters.visibility !== 'all'
    || filters.sort !== 'manual'
    || !isPhotoLibraryMetaFiltersEmpty(filters.meta);
}

export function countActivePhotoLibraryFilters(filters: PhotoLibraryFilters): number {
  let count = 0;
  if (filters.visibility !== 'all') count += 1;
  if (filters.meta.title !== null) count += 1;
  if (filters.meta.cameraKey !== null) count += 1;
  if (filters.meta.lens !== null) count += 1;
  if (filters.meta.albumId !== null) count += 1;
  if (filters.meta.tag !== null) count += 1;
  if (filters.meta.license !== null) count += 1;
  if (filters.meta.uploaded !== null) count += 1;
  if (filters.meta.challengeId !== null) count += 1;
  else if (filters.meta.challengeStatus !== null) count += 1;
  return count;
}

/** Stable segment for React Query keys when library state differs from defaults. */
export function photoLibraryFiltersQuerySegment(
  filters: PhotoLibraryFilters,
): PhotoLibraryFilters | undefined {
  if (isPhotoLibraryDefaultState(filters)) return undefined;
  return filters;
}

/** @deprecated Use photoLibraryFiltersQuerySegment */
export function photoLibraryMetaFiltersQuerySegment(
  meta: PhotoLibraryMetaFilters,
): PhotoLibraryMetaFilters | undefined {
  if (isPhotoLibraryMetaFiltersEmpty(meta)) return undefined;
  return meta;
}

export type PhotoLibraryFilterOptions = {
  titles: Array<{ value: string; label: string }>;
  cameras: Array<{ value: string; label: string }>;
  lenses: Array<{ value: string; label: string }>;
  albums: Array<{ value: string; label: string }>;
  tags: Array<{ value: string; label: string }>;
  challenges: Array<{ value: string; label: string }>;
};

type FilterOptionsRow = {
  title: string | null;
  exif_data: Record<string, unknown> | null;
  photo_tags?: Array<{ tag: string }> | null;
  album_photos?: Array<{
    album: { id: string; title: string; deleted_at: string | null } | null;
  }> | null;
  challenge_submissions?: Array<{
    status: string;
    challenge: { id: string; title: string } | null;
  }> | null;
};

export function buildPhotoLibraryFilterOptions(rows: FilterOptionsRow[]): PhotoLibraryFilterOptions {
  const titleSet = new Map<string, string>();
  const camerasByDisplay = new Map<string, string>();
  const lensSet = new Map<string, string>();
  const albumSet = new Map<string, string>();
  const tagSet = new Map<string, string>();
  const challengeSet = new Map<string, string>();

  let hasUntitled = false;

  for (const row of rows) {
    const trimmedTitle = row.title?.trim();
    if (!trimmedTitle) {
      hasUntitled = true;
    } else {
      titleSet.set(trimmedTitle, trimmedTitle);
    }

    const parsed = parseExifData(row.exif_data);
    if (parsed) {
      const formatted = formatExifData(parsed);
      if (formatted?.camera) {
        const norm = formatted.camera.trim().toLowerCase();
        if (!camerasByDisplay.has(norm)) {
          camerasByDisplay.set(norm, formatted.camera);
        }
      }
      if (parsed.lensModel) {
        lensSet.set(parsed.lensModel, parsed.lensModel);
      }
    }

    for (const ap of row.album_photos ?? []) {
      const album = ap.album;
      if (album && !album.deleted_at) {
        albumSet.set(album.id, album.title);
      }
    }

    for (const t of row.photo_tags ?? []) {
      if (t.tag) tagSet.set(t.tag, t.tag);
    }

    for (const cs of row.challenge_submissions ?? []) {
      if (cs.challenge?.id) {
        challengeSet.set(cs.challenge.id, cs.challenge.title);
      }
    }
  }

  const titles: Array<{ value: string; label: string }> = [];
  if (hasUntitled) {
    titles.push({ value: UNTITLED_PHOTO_TITLE, label: 'Untitled' });
  }
  for (const [value, label] of [...titleSet.entries()].sort((a, b) => a[1].localeCompare(b[1]))) {
    titles.push({ value, label });
  }

  const sortByLabel = (entries: Array<[string, string]>) =>
    entries.sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }));

  return {
    titles,
    cameras: sortByLabel(
      [...camerasByDisplay.values()].map((label) => [
        encodeCameraDisplayFilterKey(label),
        label,
      ]),
    ),
    lenses: sortByLabel([...lensSet.entries()]),
    albums: sortByLabel([...albumSet.entries()]),
    tags: sortByLabel([...tagSet.entries()]),
    challenges: sortByLabel([...challengeSet.entries()]),
  };
}
