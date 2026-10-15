'use client';

import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

import DailyDriverField from '@/components/gear/DailyDriverField';
import ShootingFormatTiles from '@/components/gear/ShootingFormatTiles';
import {
  GEAR_CATEGORY_LABELS,
  type UserGearProfile,
} from '@/lib/gear/types';

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
