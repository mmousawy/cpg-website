'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import AutocompleteInput from '@/components/shared/AutocompleteInput';
import Button from '@/components/shared/Button';
import Select from '@/components/shared/Select';
import {
  EMPTY_PHOTO_LIBRARY_FILTERS,
  getPhotoLibraryFilterLabel,
  NO_CAMERA_RECORDED,
  PHOTO_LIBRARY_SPECIAL_FILTER_LABELS,
  NO_LENS_RECORDED,
  NO_TAGS,
  NOT_IN_ANY_ALBUM,
  NOT_IN_ANY_CHALLENGE,
  parseTitleFilterInput,
  PHOTO_LIBRARY_CHALLENGE_STATUS_OPTIONS,
  PHOTO_LIBRARY_SORT_OPTIONS,
  PHOTO_LIBRARY_UPLOADED_OPTIONS,
  titleFilterToDisplayValue,
  type PhotoLibraryChallengeStatus,
  type PhotoLibraryFilters,
  type PhotoLibraryMetaFilters,
  type PhotoLibrarySort,
  type PhotoLibraryUploadedPreset,
} from '@/hooks/photoLibraryFilters';
import type { PhotoFilter } from '@/hooks/photoQueryCache';
import { usePhotoLibraryFilterOptions } from '@/hooks/usePhotoLibraryFilterOptions';
import { useAuth } from '@/hooks/useAuth';
import { LICENSE_ORDER, LICENSE_TYPES, type LicenseType } from '@/utils/licenses';
import clsx from 'clsx';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ANY = '';

const VISIBILITY_OPTIONS: Array<{ value: PhotoFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
];

type FilterPhotosModalProps = {
  activeFilters: PhotoLibraryFilters;
  onApply: (filters: PhotoLibraryFilters) => void;
  onClose: () => void;
};

function metaFromDraft(draft: {
  title: string;
  cameraKey: string;
  lens: string;
  albumId: string;
  tag: string;
  license: string;
  uploaded: string;
  challengeId: string;
  challengeStatus: string;
}): PhotoLibraryMetaFilters {
  return {
    title: parseTitleFilterInput(draft.title),
    cameraKey: draft.cameraKey || null,
    lens: draft.lens || null,
    albumId: draft.albumId || null,
    tag: draft.tag || null,
    license: (draft.license || null) as LicenseType | null,
    uploaded: (draft.uploaded || null) as PhotoLibraryUploadedPreset | null,
    challengeId: draft.challengeId || null,
    challengeStatus: (draft.challengeStatus || null) as PhotoLibraryChallengeStatus | null,
  };
}

type CollapsibleFilterSectionProps = {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  activeCount?: number;
  children: React.ReactNode;
};

function CollapsibleFilterSection({
  title,
  summary,
  defaultOpen = false,
  activeCount = 0,
  children,
}: CollapsibleFilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="border-b border-border-color last:border-b-0"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-foreground/7"
        aria-expanded={isOpen}
      >
        <div
          className="min-w-0 flex-1"
        >
          <div
            className="flex flex-wrap items-center gap-2"
          >
            <span
              className="text-sm font-semibold text-foreground"
            >
              {title}
            </span>
            {activeCount > 0 && (
              <span
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary"
              >
                {activeCount}
              </span>
            )}
          </div>
          {!isOpen && summary && (
            <p
              className="mt-0.5 truncate text-xs text-foreground/60"
            >
              {summary}
            </p>
          )}
        </div>
        <span
          className={clsx(
            'shrink-0 text-foreground/50 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          aria-hidden
        >
          <svg
            className="size-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>
      <div
        className={clsx(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div
          className="min-h-0 overflow-hidden"
        >
          <div
            className="px-4 pb-4 pt-1"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function labelForOption(
  value: string,
  options: Array<{ value: string; label: string }>,
): string | null {
  return getPhotoLibraryFilterLabel(value, options);
}

type SectionOpenState = {
  details: boolean;
  collections: boolean;
  challenges: boolean;
};

function initialSectionOpen(active: PhotoLibraryFilters): SectionOpenState {
  const { meta } = active;
  return {
    details: meta.title !== null || meta.license !== null || meta.uploaded !== null,
    collections: meta.albumId !== null || meta.tag !== null,
    challenges: meta.challengeId !== null || meta.challengeStatus !== null,
  };
}

export default function FilterPhotosModal({
  activeFilters,
  onApply,
  onClose,
}: FilterPhotosModalProps) {
  const { user } = useAuth();
  const modalContext = useContext(ModalContext);
  const { data: options, isPending: optionsPending } = usePhotoLibraryFilterOptions(user?.id);
  const sectionDefaults = useMemo(() => initialSectionOpen(activeFilters), [activeFilters]);

  const [visibility, setVisibility] = useState<PhotoFilter>(activeFilters.visibility);
  const [sort, setSort] = useState<PhotoLibrarySort>(activeFilters.sort);
  const [title, setTitle] = useState(() => titleFilterToDisplayValue(activeFilters.meta.title));
  const [cameraKey, setCameraKey] = useState(activeFilters.meta.cameraKey ?? ANY);
  const [lens, setLens] = useState(activeFilters.meta.lens ?? ANY);
  const [albumId, setAlbumId] = useState(activeFilters.meta.albumId ?? ANY);
  const [tag, setTag] = useState(activeFilters.meta.tag ?? ANY);
  const [license, setLicense] = useState(activeFilters.meta.license ?? ANY);
  const [uploaded, setUploaded] = useState(activeFilters.meta.uploaded ?? ANY);
  const [challengeId, setChallengeId] = useState(activeFilters.meta.challengeId ?? ANY);
  const [challengeStatus, setChallengeStatus] = useState(activeFilters.meta.challengeStatus ?? ANY);

  const anyOption = useMemo(() => [{ value: ANY, label: 'Any' }], []);

  const titleSuggestions = useMemo(
    () => (options?.titles ?? []).map((t) => t.label),
    [options?.titles],
  );
  const cameraOptions = useMemo(
    () => [
      ...anyOption,
      { value: NO_CAMERA_RECORDED, label: PHOTO_LIBRARY_SPECIAL_FILTER_LABELS[NO_CAMERA_RECORDED] },
      ...(options?.cameras ?? []),
    ],
    [anyOption, options?.cameras],
  );
  const lensOptions = useMemo(
    () => [
      ...anyOption,
      { value: NO_LENS_RECORDED, label: PHOTO_LIBRARY_SPECIAL_FILTER_LABELS[NO_LENS_RECORDED] },
      ...(options?.lenses ?? []),
    ],
    [anyOption, options?.lenses],
  );
  const albumOptions = useMemo(
    () => [
      ...anyOption,
      { value: NOT_IN_ANY_ALBUM, label: PHOTO_LIBRARY_SPECIAL_FILTER_LABELS[NOT_IN_ANY_ALBUM] },
      ...(options?.albums ?? []),
    ],
    [anyOption, options?.albums],
  );
  const tagOptions = useMemo(
    () => [
      ...anyOption,
      { value: NO_TAGS, label: PHOTO_LIBRARY_SPECIAL_FILTER_LABELS[NO_TAGS] },
      ...(options?.tags ?? []),
    ],
    [anyOption, options?.tags],
  );
  const licenseOptions = useMemo(
    () => [
      ...anyOption,
      ...LICENSE_ORDER.map((value) => ({
        value,
        label: LICENSE_TYPES[value].shortName,
      })),
    ],
    [anyOption],
  );
  const uploadedOptions = useMemo(
    () => [...anyOption, ...PHOTO_LIBRARY_UPLOADED_OPTIONS],
    [anyOption],
  );
  const challengeOptions = useMemo(
    () => [
      ...anyOption,
      {
        value: NOT_IN_ANY_CHALLENGE,
        label: PHOTO_LIBRARY_SPECIAL_FILTER_LABELS[NOT_IN_ANY_CHALLENGE],
      },
      ...(options?.challenges ?? []),
    ],
    [anyOption, options?.challenges],
  );
  const challengeStatusOptions = useMemo(
    () => [...anyOption, ...PHOTO_LIBRARY_CHALLENGE_STATUS_OPTIONS],
    [anyOption],
  );

  const sortVisibilitySummary = useMemo(() => {
    const parts: string[] = [];
    const sortLabel = PHOTO_LIBRARY_SORT_OPTIONS.find((o) => o.value === sort)?.label;
    if (sort !== 'manual' && sortLabel) parts.push(sortLabel);
    const visLabel = VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label;
    if (visibility !== 'all' && visLabel) parts.push(visLabel);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }, [sort, visibility]);

  const detailsSummary = useMemo(() => {
    const parts: string[] = [];
    if (title.trim()) parts.push(title.trim());
    const licenseLabel = labelForOption(license, licenseOptions);
    if (licenseLabel) parts.push(licenseLabel);
    const uploadedLabel = labelForOption(uploaded, uploadedOptions);
    if (uploadedLabel) parts.push(uploadedLabel);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }, [title, license, licenseOptions, uploaded, uploadedOptions]);

  const gearSummary = useMemo(() => {
    const parts: string[] = [];
    const cameraLabel = labelForOption(cameraKey, cameraOptions);
    if (cameraLabel) parts.push(cameraLabel);
    const lensLabel = labelForOption(lens, lensOptions);
    if (lensLabel) parts.push(lensLabel);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }, [cameraKey, cameraOptions, lens, lensOptions]);

  const collectionsSummary = useMemo(() => {
    const parts: string[] = [];
    const albumLabel = labelForOption(albumId, albumOptions);
    if (albumLabel) parts.push(albumLabel);
    const tagLabel = labelForOption(tag, tagOptions);
    if (tagLabel) parts.push(tagLabel);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }, [albumId, albumOptions, tag, tagOptions]);

  const challengesSummary = useMemo(() => {
    const parts: string[] = [];
    const challengeLabel = labelForOption(challengeId, challengeOptions);
    if (challengeLabel) parts.push(challengeLabel);
    const statusLabel = labelForOption(challengeStatus, challengeStatusOptions);
    if (statusLabel) parts.push(statusLabel);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }, [challengeId, challengeOptions, challengeStatus, challengeStatusOptions]);

  const sortVisibilityActiveCount =
    (sort !== 'manual' ? 1 : 0) + (visibility !== 'all' ? 1 : 0);
  const detailsActiveCount =
    (title.trim() ? 1 : 0) + (license ? 1 : 0) + (uploaded ? 1 : 0);
  const gearActiveCount = (cameraKey ? 1 : 0) + (lens ? 1 : 0);
  const collectionsActiveCount = (albumId ? 1 : 0) + (tag ? 1 : 0);
  const challengesActiveCount =
    (challengeId ? 1 : 0)
    + (challengeId && challengeId !== NOT_IN_ANY_CHALLENGE && challengeStatus ? 1 : 0);

  const handleClear = useCallback(() => {
    setVisibility('all');
    setSort('manual');
    setTitle(ANY);
    setCameraKey(ANY);
    setLens(ANY);
    setAlbumId(ANY);
    setTag(ANY);
    setLicense(ANY);
    setUploaded(ANY);
    setChallengeId(ANY);
    setChallengeStatus(ANY);
    onApply(EMPTY_PHOTO_LIBRARY_FILTERS);
    onClose();
  }, [onApply, onClose]);

  const handleApply = useCallback(() => {
    onApply({
      visibility,
      sort,
      meta: metaFromDraft({
        title,
        cameraKey,
        lens,
        albumId,
        tag,
        license,
        uploaded,
        challengeId,
        challengeStatus:
          challengeId && challengeId !== NOT_IN_ANY_CHALLENGE ? challengeStatus : ANY,
      }),
    });
    onClose();
  }, [
    visibility,
    sort,
    title,
    cameraKey,
    lens,
    albumId,
    tag,
    license,
    uploaded,
    challengeId,
    challengeStatus,
    onApply,
    onClose,
  ]);

  useEffect(() => {
    modalContext.setFooter(
      <div
        className="flex flex-wrap justify-end gap-2"
      >
        <Button
          variant="ghost"
          onClick={handleClear}
        >
          Clear
        </Button>
        <Button
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          onClick={handleApply}
        >
          Apply
        </Button>
      </div>,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- modalContext.setFooter is stable
  }, [handleApply, handleClear, onClose]);

  const fieldClass = 'flex flex-col gap-1.5';
  const fieldGrid = 'grid gap-4 sm:grid-cols-2';

  return (
    <div
      className="flex flex-col gap-3"
    >
      <p
        className="text-sm text-foreground/80"
      >
        Expand a section to adjust filters. Active choices show when a section is collapsed.
      </p>
      <div
        className="overflow-hidden rounded-lg border border-border-color bg-background/20"
      >
        <CollapsibleFilterSection
          title="Sort & visibility"
          summary={sortVisibilitySummary}
          defaultOpen
          activeCount={sortVisibilityActiveCount}
        >
          <div
            className={fieldGrid}
          >
            <label
              className={fieldClass}
            >
              <span
                className="text-sm font-medium"
              >
                Sort by
              </span>
              <Select
                value={sort}
                onValueChange={(value) => setSort(value as PhotoLibrarySort)}
                options={PHOTO_LIBRARY_SORT_OPTIONS}
              />
            </label>
            <label
              className={fieldClass}
            >
              <span
                className="text-sm font-medium"
              >
                Visibility
              </span>
              <Select
                value={visibility}
                onValueChange={(value) => setVisibility(value as PhotoFilter)}
                options={VISIBILITY_OPTIONS}
              />
            </label>
          </div>
        </CollapsibleFilterSection>

        <CollapsibleFilterSection
          title="Gear"
          summary={gearSummary}
          defaultOpen
          activeCount={gearActiveCount}
        >
          <div
            className={fieldGrid}
          >
            <label
              className={fieldClass}
            >
              <span
                className="text-sm font-medium"
              >
                Camera
              </span>
              <Select
                value={cameraKey}
                onValueChange={setCameraKey}
                options={cameraOptions}
                disabled={optionsPending}
                placeholder={optionsPending ? 'Loading…' : 'Any'}
              />
            </label>
            <label
              className={fieldClass}
            >
              <span
                className="text-sm font-medium"
              >
                Lens
              </span>
              <Select
                value={lens}
                onValueChange={setLens}
                options={lensOptions}
                disabled={optionsPending}
                placeholder={optionsPending ? 'Loading…' : 'Any'}
              />
            </label>
          </div>
        </CollapsibleFilterSection>

        <CollapsibleFilterSection
          title="Photo details"
          summary={detailsSummary}
          defaultOpen={sectionDefaults.details}
          activeCount={detailsActiveCount}
        >
          <div
            className={fieldGrid}
          >
            <label
              className={fieldClass}
            >
              <span
                className="text-sm font-medium"
              >
                Name
              </span>
              <AutocompleteInput
                value={title}
                onChange={setTitle}
                suggestions={titleSuggestions}
                disabled={optionsPending}
                loading={optionsPending}
                placeholder={optionsPending ? 'Loading…' : 'Search by name, or “Untitled”…'}
              />
            </label>
            <label
              className={fieldClass}
            >
              <span
                className="text-sm font-medium"
              >
                License
              </span>
              <Select
                value={license}
                onValueChange={setLicense}
                options={licenseOptions}
                placeholder="Any"
              />
            </label>
            <label
              className={fieldClass}
            >
              <span
                className="text-sm font-medium"
              >
                Uploaded
              </span>
              <Select
                value={uploaded}
                onValueChange={setUploaded}
                options={uploadedOptions}
                placeholder="Any time"
              />
            </label>
          </div>
        </CollapsibleFilterSection>

        <CollapsibleFilterSection
          title="Albums & tags"
          summary={collectionsSummary}
          defaultOpen={sectionDefaults.collections}
          activeCount={collectionsActiveCount}
        >
          <div
            className={fieldGrid}
          >
            <label
              className={fieldClass}
            >
              <span
                className="text-sm font-medium"
              >
                Album
              </span>
              <Select
                value={albumId}
                onValueChange={setAlbumId}
                options={albumOptions}
                disabled={optionsPending}
                placeholder={optionsPending ? 'Loading…' : 'Any'}
              />
            </label>
            <label
              className={fieldClass}
            >
              <span
                className="text-sm font-medium"
              >
                Tag
              </span>
              <Select
                value={tag}
                onValueChange={setTag}
                options={tagOptions}
                disabled={optionsPending}
                placeholder={optionsPending ? 'Loading…' : 'Any'}
              />
            </label>
          </div>
        </CollapsibleFilterSection>

        <CollapsibleFilterSection
          title="Challenges"
          summary={challengesSummary}
          defaultOpen={sectionDefaults.challenges}
          activeCount={challengesActiveCount}
        >
          <div
            className={fieldGrid}
          >
            <label
              className={fieldClass}
            >
              <span
                className="text-sm font-medium"
              >
                Challenge
              </span>
              <Select
                value={challengeId}
                onValueChange={(value) => {
                  setChallengeId(value);
                  if (!value || value === NOT_IN_ANY_CHALLENGE) setChallengeStatus(ANY);
                }}
                options={challengeOptions}
                disabled={optionsPending}
                placeholder={optionsPending ? 'Loading…' : 'Any'}
              />
            </label>
            <label
              className={fieldClass}
            >
              <span
                className="text-sm font-medium"
              >
                Submission status
              </span>
              <Select
                value={challengeStatus}
                onValueChange={setChallengeStatus}
                options={challengeStatusOptions}
                disabled={!challengeId || challengeId === NOT_IN_ANY_CHALLENGE}
                placeholder={
                  !challengeId
                    ? 'Select a challenge first'
                    : challengeId === NOT_IN_ANY_CHALLENGE
                      ? 'Not needed'
                      : 'Any status'
                }
              />
            </label>
          </div>
        </CollapsibleFilterSection>
      </div>
    </div>
  );
}
