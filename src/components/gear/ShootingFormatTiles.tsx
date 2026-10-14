'use client';

import clsx from 'clsx';

import Input from '@/components/shared/Input';
import { SHOOTING_FORMAT_ICONS } from '@/lib/gear/shootingFormatIcons';
import {
  MAX_FORMATS_OTHER_LENGTH,
  SHOOTING_FORMAT_LABELS,
  SHOOTING_FORMATS,
  type ShootingFormat,
} from '@/lib/gear/types';
import CheckCircleFilledSVG from 'public/icons/check-circle-filled.svg';

export type ShootingFormatTilesProps = {
  formats: ShootingFormat[];
  formatsOther: string;
  onFormatsChange: (formats: ShootingFormat[]) => void;
  onFormatsOtherChange: (value: string) => void;
  layout?: 'default' | 'compact';
  otherInputId?: string;
  className?: string;
};

export default function ShootingFormatTiles({
  formats,
  formatsOther,
  onFormatsChange,
  onFormatsOtherChange,
  layout = 'default',
  otherInputId = 'shooting-format-other',
  className,
}: ShootingFormatTilesProps) {
  const compact = layout === 'compact';
  const otherSelected = formats.includes('other');

  const toggleFormat = (format: ShootingFormat) => {
    const checked = formats.includes(format);
    const nextFormats = checked
      ? formats.filter((f) => f !== format)
      : [...formats, format];
    onFormatsChange(nextFormats);
    if (format === 'other' && checked) {
      onFormatsOtherChange('');
    }
  };

  return (
    <div
      className={className}
    >
      <div
        className={clsx(
          'grid gap-3',
          compact
            ? 'grid-cols-2'
            : 'grid-cols-1 2xs:grid-cols-2 md:grid-cols-4',
        )}
      >
        {SHOOTING_FORMATS.map((format) => {
          const selected = formats.includes(format);
          const Illustration = SHOOTING_FORMAT_ICONS[format];
          return (
            <button
              key={format}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleFormat(format)}
              className={clsx(
                'relative flex flex-col items-center justify-center rounded-xl border-2 text-center transition-colors',
                compact
                  ? 'min-h-24 sm:min-h-32 gap-1.5 p-2'
                  : 'min-h-24 gap-2 p-3 md:min-h-36 md:gap-3 md:p-5',
                selected
                  ? 'border-primary bg-primary/15'
                  : 'border-transparent bg-background/50 ring-1 ring-border-color hover:ring-border-color-strong',
              )}
            >
              {selected && (
                <CheckCircleFilledSVG
                  className={clsx(
                    'absolute right-2 top-2 z-10 fill-primary',
                    'size-4 md:right-3 md:top-3 md:size-5',
                  )}
                  aria-hidden
                />
              )}
              <Illustration
                className={clsx(
                  selected ? 'text-primary' : 'text-foreground/80',
                  'size-10 md:size-14',
                )}
                aria-hidden
              />
              <span
                className={clsx(
                  'font-medium',
                  'text-sm md:text-base',
                  selected && 'text-primary',
                )}
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
            htmlFor={otherInputId}
          >
            Name your format
          </label>
          <p
            className="text-foreground/70 mt-1 text-sm"
          >
            Optional label shown on your profile, e.g. infrared or cyanotype.
          </p>
          <Input
            id={otherInputId}
            className="mt-2"
            fullWidth
            value={formatsOther}
            maxLength={MAX_FORMATS_OTHER_LENGTH}
            placeholder="e.g. Infrared"
            onChange={(event) => {
              onFormatsOtherChange(
                event.target.value.slice(0, MAX_FORMATS_OTHER_LENGTH),
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
