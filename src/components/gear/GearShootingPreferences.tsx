'use client';

import clsx from 'clsx';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import AutocompleteInput from '@/components/shared/AutocompleteInput';
import Input from '@/components/shared/Input';
import { useGearCatalogSearch } from '@/hooks/useGearCatalogSearch';
import { GEAR_CATEGORY_ICONS } from '@/lib/gear/gearCategoryIcons';
import { SHOOTING_FORMAT_ICONS } from '@/lib/gear/shootingFormatIcons';
import {
  GEAR_CATEGORY_LABELS,
  MAX_FORMATS_OTHER_LENGTH,
  SHOOTING_FORMAT_LABELS,
  shootingFormatDisplayLabel,
  type GearCategory,
  type ShootingFormat,
  type UserGearProfile,
} from '@/lib/gear/types';
import CheckCircleFilledSVG from 'public/icons/check-circle-filled.svg';

type DailyDriverFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  category: GearCategory;
  value: string;
  onCommit: (text: string, catalogId: string | null) => void;
};

function DailyDriverField({
  id,
  label,
  placeholder,
  category,
  value,
  onCommit,
}: DailyDriverFieldProps) {
  const { results, loading } = useGearCatalogSearch(value, category);
  const suggestions = useMemo(() => results.map((r) => r.name), [results]);
  const Icon = GEAR_CATEGORY_ICONS[category];

  return (
    <div
      className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4"
    >
      <label
        className="flex shrink-0 items-center gap-2 text-sm font-medium md:w-40 lg:w-44"
        htmlFor={id}
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-foreground"
        >
          <Icon
            className="size-4"
            aria-hidden
          />
        </span>
        <span
          className="min-w-0"
        >
          {label}
        </span>
      </label>
      <AutocompleteInput
        id={id}
        value={value}
        onChange={(v) => {
          onCommit(v, null);
        }}
        suggestions={suggestions}
        disableFilter
        loading={loading}
        placeholder={placeholder}
        containerClassName="w-full min-w-0 md:flex-1"
        onSelect={(s) => {
          const hit = results.find((r) => r.name === s);
          onCommit(s, hit?.id ?? null);
        }}
      />
    </div>
  );
}

export default function GearShootingPreferences() {
  const { setValue, watch } = useFormContext<UserGearProfile>();
  const formats = watch('formats');
  const formatsOther = watch('formatsOther');
  const dailyDriverBody = watch('dailyDriverBody');
  const dailyDriverLens = watch('dailyDriverLens');

  const allFormats = Object.keys(SHOOTING_FORMAT_LABELS) as ShootingFormat[];
  const otherSelected = formats.includes('other');

  const toggleFormat = (format: ShootingFormat) => {
    const checked = formats.includes(format);
    const nextFormats = checked
      ? formats.filter((f) => f !== format)
      : [...formats, format];
    setValue('formats', nextFormats, { shouldDirty: true });
    if (format === 'other' && checked) {
      setValue('formatsOther', '', { shouldDirty: true });
    }
  };

  return (
    <div
      className="space-y-8"
    >
      <fieldset
        className="border-0 p-0 m-0"
      >
        <legend
          className="text-base font-medium"
        >
          How do you like to shoot?
        </legend>
        {/* {formats.length > 0 && (
          <p
            className="text-foreground/70 mt-1 text-sm"
          >
            {formats.map((format) => shootingFormatDisplayLabel(format, formatsOther)).join(', ')}
          </p>
        )} */}
        <div
          className="mt-4 grid grid-cols-1 2xs:grid-cols-2 gap-3 md:grid-cols-4"
        >
          {allFormats.map((format) => {
            const selected = formats.includes(format);
            const Illustration = SHOOTING_FORMAT_ICONS[format];
            return (
              <button
                key={format}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleFormat(format)}
                className={clsx(
                  'relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 text-center transition-colors md:min-h-36 md:gap-3 md:p-5',
                  selected
                    ? 'border-primary bg-primary/15'
                    : 'border-transparent bg-background/50 ring-1 ring-border-color hover:ring-border-color-strong',
                )}
              >
                {selected && (
                  <CheckCircleFilledSVG
                    className="absolute right-2 top-2 z-10 size-4 fill-primary md:right-3 md:top-3 md:size-5"
                    aria-hidden
                  />
                )}
                <Illustration
                  className={clsx('size-10 md:size-14', selected ? 'text-primary' : 'text-foreground/80')}
                  aria-hidden
                />
                <span
                  className={clsx('text-sm font-medium md:text-base', selected && 'text-primary')}
                >
                  {SHOOTING_FORMAT_LABELS[format]}
                </span>
              </button>
            );
          })}
        </div>
        {otherSelected && (
          <div
            className="mt-4 max-w-md"
          >
            <label
              className="text-sm font-medium"
              htmlFor="account-shooting-format-other"
            >
              What else?
            </label>
            <p
              className="text-foreground/70 mt-1 text-sm"
            >
              Optional label shown on your profile, e.g. infrared or cyanotype.
            </p>
            <Input
              id="account-shooting-format-other"
              className="mt-2"
              fullWidth
              value={formatsOther}
              maxLength={MAX_FORMATS_OTHER_LENGTH}
              placeholder="e.g. Infrared"
              onChange={(event) => {
                setValue(
                  'formatsOther',
                  event.target.value.slice(0, MAX_FORMATS_OTHER_LENGTH),
                  { shouldDirty: true },
                );
              }}
            />
          </div>
        )}
      </fieldset>

      <div
        className="flex flex-col gap-4 mt-6"
      >
        <div>
          <p
            className="text-base font-medium"
          >
            Daily driver
          </p>
          <p
            className="text-sm text-foreground/70 mt-1"
          >
            What do you reach for most often?
          </p>
        </div>
        <div
          className="flex flex-col gap-4 md:max-w-lg"
        >
          <DailyDriverField
            id="account-daily-driver-body"
            label={GEAR_CATEGORY_LABELS.camera_body}
            placeholder="e.g. Fujifilm X-T5"
            category="camera_body"
            value={dailyDriverBody}
            onCommit={(text, catalogId) => {
              setValue('dailyDriverBody', text, { shouldDirty: true });
              setValue('dailyDriverBodyCatalogId', catalogId, { shouldDirty: true });
            }}
          />
          <DailyDriverField
            id="account-daily-driver-lens"
            label={GEAR_CATEGORY_LABELS.lens}
            placeholder="e.g. XF 35mm F1.4"
            category="lens"
            value={dailyDriverLens}
            onCommit={(text, catalogId) => {
              setValue('dailyDriverLens', text, { shouldDirty: true });
              setValue('dailyDriverLensCatalogId', catalogId, { shouldDirty: true });
            }}
          />
        </div>
      </div>
    </div>
  );
}
