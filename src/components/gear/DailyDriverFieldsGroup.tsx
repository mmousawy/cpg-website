'use client';

import clsx from 'clsx';

import DailyDriverField from '@/components/gear/DailyDriverField';
import ScrappyCameraIllustration from '@/components/gear/ScrappyCameraIllustration';
import { GEAR_CATEGORY_LABELS } from '@/lib/gear/types';
import type { GearCategory } from '@/lib/gear/types';

type DailyDriverFieldsGroupProps = {
  bodyId: string;
  lensId: string;
  bodyValue: string;
  lensValue: string;
  onCommitBody: (text: string, catalogId: string | null) => void;
  onCommitLens: (text: string, catalogId: string | null) => void;
  peerItems: Array<{ name: string; category: GearCategory; catalogId: string | null }>;
  fieldsClassName?: string;
};

export default function DailyDriverFieldsGroup({
  bodyId,
  lensId,
  bodyValue,
  lensValue,
  onCommitBody,
  onCommitLens,
  peerItems,
  fieldsClassName,
}: DailyDriverFieldsGroupProps) {
  const showIllustration = bodyValue.trim().length > 0;

  return (
    <div
      className="flex items-center gap-4"
    >
      <div
        className={clsx('flex min-w-0 flex-1 flex-col gap-4', fieldsClassName)}
      >
        <DailyDriverField
          id={bodyId}
          label={GEAR_CATEGORY_LABELS.camera_body}
          placeholder="e.g. Fujifilm X-T5"
          category="camera_body"
          value={bodyValue}
          peerItems={peerItems}
          onCommit={onCommitBody}
        />
        <DailyDriverField
          id={lensId}
          label={GEAR_CATEGORY_LABELS.lens}
          placeholder="e.g. XF 35mm F1.4"
          category="lens"
          value={lensValue}
          peerItems={peerItems}
          onCommit={onCommitLens}
        />
      </div>
      {showIllustration && (
        <ScrappyCameraIllustration
          camera={bodyValue}
          className="h-14 max-sm:mt-7 max-sm:self-start w-auto shrink-0 object-contain sm:h-23 mx-auto"
        />
      )}
    </div>
  );
}
