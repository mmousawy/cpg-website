'use client';

import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

import DailyDriverFieldsGroup from '@/components/gear/DailyDriverFieldsGroup';
import ShootingFormatTiles from '@/components/gear/ShootingFormatTiles';
import type { UserGearProfile } from '@/lib/gear/types';

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
        <DailyDriverFieldsGroup
          bodyId="account-daily-driver-body"
          lensId="account-daily-driver-lens"
          bodyValue={dailyDriverBody}
          lensValue={dailyDriverLens}
          peerItems={inventoryItems}
          onCommitBody={commitBody}
          onCommitLens={commitLens}
          fieldsClassName="md:max-w-lg"
        />
      </div>
    </div>
  );
}
