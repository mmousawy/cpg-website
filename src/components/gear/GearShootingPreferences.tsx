'use client';

import { useCallback, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import ShootingFormatTiles from '@/components/gear/ShootingFormatTiles';
import AutocompleteInput from '@/components/shared/AutocompleteInput';
import { useGearCatalogSearch } from '@/hooks/useGearCatalogSearch';
import { resolveGearLabelCasing } from '@/lib/gear/canonicalGearItem';
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
  peerItems: Array<{ name: string; category: GearCategory; catalogId: string | null }>;
};

function DailyDriverField({
  id,
  label,
  placeholder,
  category,
  value,
  onCommit,
  peerItems,
}: DailyDriverFieldProps) {
  const { results, loading } = useGearCatalogSearch(value, category);
  const suggestions = useMemo(() => results.map((r) => r.name), [results]);
  const Icon = GEAR_CATEGORY_ICONS[category];

  const commitValue = useCallback(
    (text: string, catalogId: string | null, catalogLabel?: string | null) => {
      const resolved = resolveGearLabelCasing({
        text,
        category,
        catalogId,
        catalogLabel,
        peerItems,
      });
      onCommit(resolved.name, resolved.catalogId);
    },
    [category, onCommit, peerItems],
  );

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
          commitValue(v, null);
        }}
        suggestions={suggestions}
        disableFilter
        loading={loading}
        placeholder={placeholder}
        containerClassName="w-full min-w-0 md:flex-1"
        onSelect={(s) => {
          const hit = results.find((r) => r.name === s)
            ?? results.find((r) => r.name.toLowerCase() === s.toLowerCase());
          commitValue(hit?.name ?? s, hit?.id ?? null, hit?.name);
        }}
        onSubmit={(text) => {
          const hit = results.find((r) => r.name.toLowerCase() === text.toLowerCase());
          commitValue(text, hit?.id ?? null, hit?.name);
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
  const inventoryItems = watch('items');

  const commitBody = useCallback((text: string, catalogId: string | null) => {
    setValue('dailyDriverBody', text, { shouldDirty: true });
    setValue('dailyDriverBodyCatalogId', catalogId, { shouldDirty: true });
  }, [setValue]);

  const commitLens = useCallback((text: string, catalogId: string | null) => {
    setValue('dailyDriverLens', text, { shouldDirty: true });
    setValue('dailyDriverLensCatalogId', catalogId, { shouldDirty: true });
  }, [setValue]);

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
            peerItems={inventoryItems}
            onCommit={commitBody}
          />
          <DailyDriverField
            id="account-daily-driver-lens"
            label={GEAR_CATEGORY_LABELS.lens}
            placeholder="e.g. XF 35mm F1.4"
            category="lens"
            value={dailyDriverLens}
            peerItems={inventoryItems}
            onCommit={commitLens}
          />
        </div>
      </div>
    </div>
  );
}
