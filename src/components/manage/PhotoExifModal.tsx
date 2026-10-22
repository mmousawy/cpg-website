'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import { ModalContext } from '@/app/providers/ModalProvider';
import AutocompleteInput from '@/components/shared/AutocompleteInput';
import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';
import { EVENT_TIMEZONE } from '@/lib/events/status';
import { formatCatalogDisplayName } from '@/lib/gear/formatCatalogDisplayName';
import { useAuth } from '@/hooks/useAuth';
import { useGearCatalogSearch } from '@/hooks/useGearCatalogSearch';
import type { PhotoFilter } from '@/hooks/photoQueryCache';
import {
  confirmBulkExifSave,
  prepareBulkExifApply,
} from '@/components/manage/bulkExifSaveConfirm';
import PhotoExifReadOnlyContent from '@/components/manage/PhotoExifReadOnlyContent';
import { useBulkUpdatePhotoExif, useUpdatePhotoExif } from '@/hooks/usePhotoMutations';
import type { PhotoWithAlbums } from '@/types/photos';
import { confirmClearPhotoCaptureDetails, confirmUnsavedChanges } from '@/utils/confirmHelpers';
import { toUserFacingError } from '@/utils/userFacingHttpError';
import {
  type ExifEditFormValues,
  emptyExifEditFormValues,
  exifToFormValues,
  getCommonExifFormValues,
  parseExposureTimeInput,
} from '@/utils/exif';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const EXIF_SAVE_SUCCESS_MS = 650;
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import CheckMiniSVG from 'public/icons/check-mini.svg';

/** Empty capture fields: softer placeholder; filled state uses Input `filled` prop. */
const EXIF_FIELD_INPUT_CLASS = 'placeholder:text-foreground/45';

const exifEditFormSchema = z
  .object({
    camera: z.string(),
    lensModel: z.string(),
    iso: z.string(),
    aperture: z.string(),
    exposureTime: z.string(),
    focalLength: z.string(),
    captureTime: z.string(),
    latitude: z.string(),
    longitude: z.string(),
  })
  .superRefine((data, ctx) => {
    const iso = data.iso.trim();
    if (iso && !/^\d+$/.test(iso)) {
      ctx.addIssue({ code: 'custom', message: 'ISO must be a whole number', path: ['iso'] });
    }

    const aperture = data.aperture.trim();
    if (aperture) {
      const n = Number(aperture);
      if (!Number.isFinite(n) || n <= 0) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid aperture (e.g. 2.8)', path: ['aperture'] });
      }
    }

    const exposure = data.exposureTime.trim();
    if (exposure && parseExposureTimeInput(exposure) == null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use a fraction (1/250) or seconds (2s)',
        path: ['exposureTime'],
      });
    }

    const focal = data.focalLength.trim();
    if (focal) {
      const n = Number(focal);
      if (!Number.isFinite(n) || n <= 0) {
        ctx.addIssue({ code: 'custom', message: 'Enter focal length in mm', path: ['focalLength'] });
      }
    }

    const lat = data.latitude.trim();
    const lng = data.longitude.trim();
    if (lat && !lng) {
      ctx.addIssue({ code: 'custom', message: 'Enter longitude or clear latitude', path: ['longitude'] });
    }
    if (!lat && lng) {
      ctx.addIssue({ code: 'custom', message: 'Enter latitude or clear longitude', path: ['latitude'] });
    }
    if (lat && lng) {
      const latN = Number(lat);
      const lngN = Number(lng);
      if (!Number.isFinite(latN) || Math.abs(latN) > 90) {
        ctx.addIssue({ code: 'custom', message: 'Latitude must be between -90 and 90', path: ['latitude'] });
      }
      if (!Number.isFinite(lngN) || Math.abs(lngN) > 180) {
        ctx.addIssue({ code: 'custom', message: 'Longitude must be between -180 and 180', path: ['longitude'] });
      }
    }
  });

type PhotoExifModalProps = {
  photos: PhotoWithAlbums[];
  photoFilter?: PhotoFilter;
  albumId?: string | null;
  onClose: () => void;
  readOnly?: boolean;
};

function photoHasCaptureDetails(photo: PhotoWithAlbums): boolean {
  return Boolean(
    photo.exif_data
    && typeof photo.exif_data === 'object'
    && Object.keys(photo.exif_data as object).length > 0,
  );
}

function PhotoExifModalReadOnly({
  photo,
  onClose,
}: {
  photo: PhotoWithAlbums;
  onClose: () => void;
}) {
  const modalContext = useContext(ModalContext);
  const handleCloseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    handleCloseRef.current = () => {
      modalContext.setIsOpen(false);
      onClose();
    };
  }, [modalContext, onClose]);

  const footerContent = useMemo(
    () => (
      <div
        className="flex justify-end"
      >
        <Button
          type="button"
          onClick={() => handleCloseRef.current?.()}
        >
          Close
        </Button>
      </div>
    ),
    [],
  );

  useEffect(() => {
    modalContext.setFooter(footerContent);
    return () => modalContext.setBeforeCloseCheck(null);
  }, [footerContent, modalContext]);

  return (
    <div
      className="space-y-4"
    >
      <p
        className="text-sm text-foreground/70"
      >
        Capture details shown on the public photo page (read-only).
      </p>
      <PhotoExifReadOnlyContent
        photo={photo}
      />
    </div>
  );
}

function PhotoExifModalEditable({
  photos,
  photoFilter = 'all',
  albumId = null,
  onClose,
}: Omit<PhotoExifModalProps, 'readOnly'>) {
  const modalContext = useContext(ModalContext);
  const confirm = useConfirm();
  const { user, profile } = useAuth();
  const skipCloseCheckRef = useRef(false);
  const clearGpsOnSaveRef = useRef(false);
  const handleSubmitRef = useRef<(() => Promise<void>) | null>(null);
  const handleCloseRef = useRef<(() => void) | null>(null);
  const handleRemoveAllRef = useRef<(() => Promise<void>) | null>(null);

  const isBatch = photos.length > 1;
  const photo = photos[0];
  const photoIdsKey = useMemo(() => photos.map((p) => p.id).join(','), [photos]);

  const savedValues = useMemo(
    () => (isBatch
      ? getCommonExifFormValues(photos)
      : exifToFormValues(photo.exif_data as Record<string, unknown> | null | undefined)),
    [isBatch, photo.exif_data, photo.id, photos],
  );

  const updateExifMutation = useUpdatePhotoExif(user?.id, photoFilter, profile?.nickname, albumId);
  const bulkUpdateExifMutation = useBulkUpdatePhotoExif(user?.id, photoFilter, profile?.nickname, albumId);
  const hasCaptureDetails = photos.some(photoHasCaptureDetails);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ExifEditFormValues>({
    resolver: zodResolver(exifEditFormSchema),
    defaultValues: savedValues,
  });

  useEffect(() => {
    clearGpsOnSaveRef.current = false;
    setSaveSuccess(false);
    reset(savedValues);
  }, [photoIdsKey, reset, savedValues]);

  const formValues = watch();
  const cameraQuery = formValues.camera;
  const lensQuery = formValues.lensModel;
  const isExifFieldFilled = (key: keyof ExifEditFormValues) => Boolean(formValues[key]?.trim());
  const { results: cameraResults, loading: cameraLoading } = useGearCatalogSearch(cameraQuery, null);
  const { results: lensResults, loading: lensLoading } = useGearCatalogSearch(lensQuery, 'lens');

  const cameraSuggestions = useMemo(
    () => cameraResults.map((r) => formatCatalogDisplayName(r.brand, r.name)),
    [cameraResults],
  );
  const lensSuggestions = useMemo(() => lensResults.map((r) => r.name), [lensResults]);

  const clearLocation = () => {
    if (isBatch) {
      clearGpsOnSaveRef.current = true;
    }
    setValue('latitude', '', { shouldDirty: true });
    setValue('longitude', '', { shouldDirty: true });
  };

  const onSubmit = useCallback(
    async (data: ExifEditFormValues) => {
      try {
        if (isBatch) {
          const clearGps = clearGpsOnSaveRef.current;
          const { form: applyForm, clearGps: applyClearGps, changes } = prepareBulkExifApply(
            photos,
            data,
            clearGps,
          );
          if (changes.length === 0) {
            return;
          }
          const confirmed = await confirm(confirmBulkExifSave(photos.length, changes));
          if (!confirmed) {
            return;
          }
          await bulkUpdateExifMutation.mutateAsync({
            photoIds: photos.map((p) => p.id),
            form: applyForm,
            mergeOptions: { clearGps: applyClearGps },
            exifBaseByPhotoId: Object.fromEntries(
              photos.map((p) => [
                p.id,
                p.exif_data as Record<string, unknown> | null | undefined,
              ]),
            ),
          });
          clearGpsOnSaveRef.current = false;
        } else {
          await updateExifMutation.mutateAsync({
            photoId: photo.id,
            form: data,
            existingExif: photo.exif_data as Record<string, unknown> | null | undefined,
          });
        }
        skipCloseCheckRef.current = true;
        reset(data);
        setSaveSuccess(true);
        await new Promise((resolve) => setTimeout(resolve, EXIF_SAVE_SUCCESS_MS));
        modalContext.setIsOpen(false);
        onClose();
      } catch {
        setSaveSuccess(false);
        // mutation error surfaced below
      }
    },
    [
      bulkUpdateExifMutation,
      confirm,
      isBatch,
      modalContext,
      onClose,
      photo.exif_data,
      photo.id,
      photos,
      reset,
      updateExifMutation,
    ],
  );

  const onRemoveAll = useCallback(async () => {
    const confirmed = await confirm(confirmClearPhotoCaptureDetails(photos.length));
    if (!confirmed) return;
    try {
      if (isBatch) {
        await bulkUpdateExifMutation.mutateAsync({
          photoIds: photos.map((p) => p.id),
          clearAll: true,
        });
      } else {
        await updateExifMutation.mutateAsync({ photoId: photo.id, clearAll: true });
      }
      skipCloseCheckRef.current = true;
      reset(emptyExifEditFormValues());
      modalContext.setIsOpen(false);
      onClose();
    } catch {
      // mutation error surfaced below
    }
  }, [
    bulkUpdateExifMutation,
    confirm,
    isBatch,
    modalContext,
    onClose,
    photo.id,
    photos,
    reset,
    updateExifMutation,
  ]);

  const isSaving = isSubmitting || updateExifMutation.isPending || bulkUpdateExifMutation.isPending;
  const formLocked = isSaving || saveSuccess;

  useEffect(() => {
    handleSubmitRef.current = () => handleSubmit(onSubmit)();
    handleCloseRef.current = () => modalContext.requestClose();
    handleRemoveAllRef.current = onRemoveAll;
  }, [handleSubmit, modalContext, onRemoveAll, onSubmit]);

  useEffect(() => {
    modalContext.setBeforeCloseCheck(async () => {
      if (skipCloseCheckRef.current) {
        skipCloseCheckRef.current = false;
        return true;
      }
      if (saveSuccess || isSaving) return false;
      if (!isDirty) return true;
      const confirmed = await confirm(confirmUnsavedChanges());
      return confirmed;
    });
    return () => modalContext.setBeforeCloseCheck(null);
  }, [confirm, isDirty, isSaving, modalContext, saveSuccess]);
  const saveError = updateExifMutation.error ?? bulkUpdateExifMutation.error;

  const footerContent = useMemo(
    () => (
      <div
        className="flex flex-wrap items-center justify-between gap-2"
      >
        <Button
          type="button"
          variant="danger"
          onClick={() => handleRemoveAllRef.current?.()}
          disabled={!hasCaptureDetails || formLocked}
        >
          Remove all data
        </Button>
        <div
          className="flex gap-2"
        >
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleCloseRef.current?.()}
            disabled={formLocked}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmitRef.current?.()}
            disabled={formLocked || (!isDirty && !saveSuccess)}
            loading={isSaving && !saveSuccess}
            icon={saveSuccess ? (
              <CheckMiniSVG
                className="size-5 -ml-0.5"
              />
            ) : undefined}
          >
            {saveSuccess ? 'Saved' : 'Save'}
          </Button>
        </div>
      </div>
    ),
    [formLocked, hasCaptureDetails, isDirty, isSaving, saveSuccess],
  );

  useEffect(() => {
    modalContext.setFooter(footerContent);
  }, [footerContent, modalContext]);

  const fieldError = (name: keyof ExifEditFormValues) => {
    const message = errors[name]?.message;
    if (!message || typeof message !== 'string') return null;
    return message;
  };

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      {isBatch && (
        <p
          className="text-xs text-foreground/60"
        >
          Leave a field empty to keep each photo&apos;s existing value.
        </p>
      )}

      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <div
          className="flex flex-col gap-2 sm:col-span-2"
        >
          <label
            className="text-sm font-medium"
            htmlFor="exif-camera"
          >
            Camera
          </label>
          <AutocompleteInput
            id="exif-camera"
            value={cameraQuery}
            onChange={(v) => setValue('camera', v, { shouldDirty: true })}
            suggestions={cameraSuggestions}
            disableFilter
            loading={cameraLoading}
            placeholder="Camera or phone"
            disabled={formLocked}
            filled={isExifFieldFilled('camera')}
            className={EXIF_FIELD_INPUT_CLASS}
            onSelect={(s) => {
              const hit = cameraResults.find((r) => formatCatalogDisplayName(r.brand, r.name) === s)
                ?? cameraResults.find((r) => r.name === s);
              const name = hit ? formatCatalogDisplayName(hit.brand, hit.name) : s;
              setValue('camera', name, { shouldDirty: true });
            }}
          />
          {fieldError('camera') && (
            <p
              className="text-xs text-red-500"
            >
              {fieldError('camera')}
            </p>
          )}
        </div>
      </div>

      <div
        className="flex flex-col gap-2"
      >
        <label
          className="text-sm font-medium"
          htmlFor="exif-lens"
        >
          Lens
        </label>
        <AutocompleteInput
          id="exif-lens"
          value={lensQuery}
          onChange={(v) => setValue('lensModel', v, { shouldDirty: true })}
          suggestions={lensSuggestions}
          disableFilter
          loading={lensLoading}
          placeholder="Lens name"
          disabled={formLocked}
          filled={isExifFieldFilled('lensModel')}
          className={EXIF_FIELD_INPUT_CLASS}
          onSelect={(s) => {
            const hit = lensResults.find((r) => r.name === s);
            setValue('lensModel', hit?.name ?? s, { shouldDirty: true });
          }}
        />
      </div>

      <div
        className="grid grid-cols-2 gap-4"
      >
        <div
          className="flex flex-col gap-2"
        >
          <label
            className="text-sm font-medium"
            htmlFor="exif-iso"
          >
            ISO
          </label>
          <Input
            id="exif-iso"
            inputMode="numeric"
            {...register('iso')}
            placeholder="400"
            disabled={formLocked}
            error={!!errors.iso}
            filled={isExifFieldFilled('iso')}
            className={EXIF_FIELD_INPUT_CLASS}
          />
          {fieldError('iso') && (
            <p
              className="text-xs text-red-500"
            >
              {fieldError('iso')}
            </p>
          )}
        </div>
        <div
          className="flex flex-col gap-2"
        >
          <label
            className="text-sm font-medium"
            htmlFor="exif-aperture"
          >
            Aperture (f-number)
          </label>
          <Input
            id="exif-aperture"
            inputMode="decimal"
            {...register('aperture')}
            placeholder="2.8"
            disabled={formLocked}
            error={!!errors.aperture}
            filled={isExifFieldFilled('aperture')}
            className={EXIF_FIELD_INPUT_CLASS}
          />
          {fieldError('aperture') && (
            <p
              className="text-xs text-red-500"
            >
              {fieldError('aperture')}
            </p>
          )}
        </div>
        <div
          className="flex flex-col gap-2"
        >
          <label
            className="text-sm font-medium"
            htmlFor="exif-shutter"
          >
            Shutter
          </label>
          <Input
            id="exif-shutter"
            {...register('exposureTime')}
            placeholder="1/250 or 2s"
            disabled={formLocked}
            error={!!errors.exposureTime}
            filled={isExifFieldFilled('exposureTime')}
            className={EXIF_FIELD_INPUT_CLASS}
          />
          {fieldError('exposureTime') && (
            <p
              className="text-xs text-red-500"
            >
              {fieldError('exposureTime')}
            </p>
          )}
        </div>
        <div
          className="flex flex-col gap-2"
        >
          <label
            className="text-sm font-medium"
            htmlFor="exif-focal"
          >
            Focal length (mm)
          </label>
          <Input
            id="exif-focal"
            inputMode="decimal"
            {...register('focalLength')}
            placeholder="50"
            disabled={formLocked}
            error={!!errors.focalLength}
            filled={isExifFieldFilled('focalLength')}
            className={EXIF_FIELD_INPUT_CLASS}
          />
          {fieldError('focalLength') && (
            <p
              className="text-xs text-red-500"
            >
              {fieldError('focalLength')}
            </p>
          )}
        </div>
      </div>

      <div
        className="flex flex-col gap-2"
      >
        <label
          className="text-sm font-medium"
          htmlFor="exif-capture-time"
        >
          Capture time (
          {EVENT_TIMEZONE}
          )
        </label>
        <Input
          id="exif-capture-time"
          type="datetime-local"
          {...register('captureTime')}
          disabled={formLocked}
          filled={isExifFieldFilled('captureTime')}
          className={EXIF_FIELD_INPUT_CLASS}
        />
      </div>

      <div
        className="space-y-2"
      >
        <div
          className="flex items-center justify-between gap-2"
        >
          <span
            className="text-sm font-medium"
          >
            Location (GPS)
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={clearLocation}
            disabled={formLocked}
          >
            Remove location
          </Button>
        </div>
        <div
          className="grid grid-cols-2 gap-4"
        >
          <div
            className="flex flex-col gap-2"
          >
            <label
              className="text-xs text-foreground/70"
              htmlFor="exif-lat"
            >
              Latitude
            </label>
            <Input
              id="exif-lat"
              inputMode="decimal"
              {...register('latitude')}
              placeholder="52.3676"
              disabled={formLocked}
              error={!!errors.latitude}
              filled={isExifFieldFilled('latitude')}
              className={EXIF_FIELD_INPUT_CLASS}
            />
          </div>
          <div
            className="flex flex-col gap-2"
          >
            <label
              className="text-xs text-foreground/70"
              htmlFor="exif-lng"
            >
              Longitude
            </label>
            <Input
              id="exif-lng"
              inputMode="decimal"
              {...register('longitude')}
              placeholder="4.9041"
              disabled={formLocked}
              error={!!errors.longitude}
              filled={isExifFieldFilled('longitude')}
              className={EXIF_FIELD_INPUT_CLASS}
            />
          </div>
        </div>
        {(fieldError('latitude') || fieldError('longitude')) && (
          <p
            className="text-xs text-red-500"
          >
            {fieldError('latitude') || fieldError('longitude')}
          </p>
        )}
      </div>

      {saveError && (
        <ErrorMessage
          variant="compact"
        >
          {toUserFacingError(saveError, 'Could not save capture details')}
        </ErrorMessage>
      )}
    </form>
  );
}

export default function PhotoExifModal({
  readOnly = false,
  photos,
  ...props
}: PhotoExifModalProps) {
  const photo = photos[0];
  if (!photo) return null;

  if (readOnly) {
    return (
      <PhotoExifModalReadOnly
        photo={photo}
        onClose={props.onClose}
      />
    );
  }
  return (
    <PhotoExifModalEditable
      photos={photos}
      {...props}
    />
  );
}
