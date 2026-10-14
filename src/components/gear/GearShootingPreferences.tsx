'use client';

import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import ShootingFormatTiles from '@/components/gear/ShootingFormatTiles';
import AutocompleteInput from '@/components/shared/AutocompleteInput';
import { useGearCatalogSearch } from '@/hooks/useGearCatalogSearch';
import { GEAR_CATEGORY_ICONS } from '@/lib/gear/gearCategoryIcons';
import {
  GEAR_CATEGORY_LABELS,
  type GearCategory,
  type UserGearProfile,
} from '@/lib/gear/types';

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
        <ShootingFormatTiles
          className="mt-4"
          formats={formats}
          formatsOther={formatsOther}
          onFormatsChange={(next) => setValue('formats', next, { shouldDirty: true })}
          onFormatsOtherChange={(value) => setValue('formatsOther', value, { shouldDirty: true })}
          otherInputId="account-shooting-format-other"
          layout="default"
        />
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
