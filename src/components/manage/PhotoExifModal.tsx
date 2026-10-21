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
import PhotoExifReadOnlyContent from '@/components/manage/PhotoExifReadOnlyContent';
import { useBulkUpdatePhotoExif, useUpdatePhotoExif } from '@/hooks/usePhotoMutations';
import type { PhotoWithAlbums } from '@/types/photos';
import { confirmClearPhotoCaptureDetails, confirmUnsavedChanges } from '@/utils/confirmHelpers';
import {
  type ExifEditFormValues,
  emptyExifEditFormValues,
  exifToFormValues,
  getCommonExifFormValues,
  parseExposureTimeInput,
} from '@/utils/exif';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const exifEditFormSchema = z
  .object({
    make: z.string(),
    model: z.string(),
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

function makeIsImpliedByModel(make: string, model: string): boolean {
  const makeLower = make.toLowerCase();
  const modelLower = model.toLowerCase();
  if (modelLower.includes(makeLower)) return true;
  return makeLower === 'apple' && /iphone|ipad|ipod/.test(modelLower);
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
    reset(savedValues);
  }, [photoIdsKey, reset, savedValues]);

  const modelQuery = watch('model');
  const lensQuery = watch('lensModel');
  const { results: modelResults, loading: modelLoading } = useGearCatalogSearch(modelQuery, null);
  const { results: lensResults, loading: lensLoading } = useGearCatalogSearch(lensQuery, 'lens');

  const modelSuggestions = useMemo(
    () => modelResults.map((r) => formatCatalogDisplayName(r.brand, r.name)),
    [modelResults],
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
          await bulkUpdateExifMutation.mutateAsync({
            photoIds: photos.map((p) => p.id),
            form: data,
            mergeOptions: { clearGps: clearGpsOnSaveRef.current },
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
        modalContext.setIsOpen(false);
        onClose();
      } catch {
        // mutation error surfaced below
      }
    },
    [
      bulkUpdateExifMutation,
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
      if (!isDirty) return true;
      const confirmed = await confirm(confirmUnsavedChanges());
      return confirmed;
    });
    return () => modalContext.setBeforeCloseCheck(null);
  }, [confirm, isDirty, modalContext]);

  const isSaving = isSubmitting || updateExifMutation.isPending || bulkUpdateExifMutation.isPending;
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
          disabled={!hasCaptureDetails || isSaving}
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
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmitRef.current?.()}
            disabled={isSaving || !isDirty}
            loading={isSaving}
          >
            Save
          </Button>
        </div>
      </div>
    ),
    [hasCaptureDetails, isDirty, isSaving],
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
      <p
        className="text-sm text-foreground/70"
      >
        {isBatch
          ? 'These details are shown on your public photo pages. They are stored separately from the image files.'
          : 'These details are shown to viewers on your public photo page. They are stored separately from the image file.'}
      </p>
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
          className="flex flex-col gap-2"
        >
          <label
            className="text-sm font-medium"
            htmlFor="exif-make"
          >
            Make
          </label>
          <Input
            id="exif-make"
            {...register('make')}
            placeholder="e.g. Canon"
            disabled={isSaving}
          />
        </div>

        <div
          className="flex flex-col gap-2"
        >
          <label
            className="text-sm font-medium"
            htmlFor="exif-model"
          >
            Model
          </label>
          <AutocompleteInput
            id="exif-model"
            value={modelQuery}
            onChange={(v) => setValue('model', v, { shouldDirty: true })}
            suggestions={modelSuggestions}
            disableFilter
            loading={modelLoading}
            placeholder="Camera or phone model"
            disabled={isSaving}
            onSelect={(s) => {
              const hit = modelResults.find((r) => formatCatalogDisplayName(r.brand, r.name) === s)
                ?? modelResults.find((r) => r.name === s);
              const name = hit ? formatCatalogDisplayName(hit.brand, hit.name) : s;
              setValue('model', name, { shouldDirty: true });
              if (hit?.brand) {
                const currentMake = watch('make');
                if (!currentMake || !makeIsImpliedByModel(hit.brand, name)) {
                  setValue('make', hit.brand, { shouldDirty: true });
                }
              }
            }}
          />
          {fieldError('model') && (
            <p
              className="text-xs text-red-500"
            >
              {fieldError('model')}
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
          disabled={isSaving}
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
            disabled={isSaving}
            error={!!errors.iso}
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
            disabled={isSaving}
            error={!!errors.aperture}
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
            disabled={isSaving}
            error={!!errors.exposureTime}
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
            disabled={isSaving}
            error={!!errors.focalLength}
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
          disabled={isSaving}
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
            disabled={isSaving}
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
              disabled={isSaving}
              error={!!errors.latitude}
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
              disabled={isSaving}
              error={!!errors.longitude}
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
          {saveError.message}
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
