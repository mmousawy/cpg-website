'use client';

import { Control, Controller, UseFormSetValue, UseFormWatch } from 'react-hook-form';

import AlbumCardStylePicker from '@/components/account/AlbumCardStylePicker';
import MotionPreferencePicker from '@/components/account/MotionPreferencePicker';
import PhotoCaptionsPicker from '@/components/account/PhotoCaptionsPicker';
import PhotoGridDensityPicker from '@/components/account/PhotoGridDensityPicker';
import PhotoGridStylePicker from '@/components/account/PhotoGridStylePicker';
import ThemePreferencePicker from '@/components/account/ThemePreferencePicker';
import Container from '@/components/layout/Container';
import Checkbox from '@/components/shared/Checkbox';
import type { AccountFormData } from '@/hooks/useAccountForm';
import type { EmailTypeData } from '@/utils/emailPreferencesClient';

interface PreferencesSectionProps {
  control: Control<AccountFormData>;
  themeMounted: boolean;
  emailTypes: EmailTypeData[];
  watch: UseFormWatch<AccountFormData>;
  setValue: UseFormSetValue<AccountFormData>;
}

export default function PreferencesSection({
  control,
  themeMounted,
  emailTypes,
  watch,
  setValue,
}: PreferencesSectionProps) {
  return (
    <div>
      <h2
        className="mb-2 sm:mb-4 text-lg font-semibold opacity-80 font-heading"
      >
        Preferences
      </h2>
      <Container>
        <div
          className="space-y-6"
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Theme</label>
            <Controller
              name="theme"
              control={control}
              render={({ field }) => (
                <ThemePreferencePicker
                  value={field.value}
                  onChange={field.onChange}
                  selectionReady={themeMounted}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Album card style</label>
            <Controller
              name="albumCardStyle"
              control={control}
              render={({ field }) => (
                <AlbumCardStylePicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Photo grid style</label>
            <Controller
              name="photoGridStyle"
              control={control}
              render={({ field }) => (
                <PhotoGridStylePicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Photo grid density</label>
            <Controller
              name="photoGridDensity"
              control={control}
              render={({ field }) => (
                <PhotoGridDensityPicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Photo captions</label>
            <Controller
              name="photoCaptions"
              control={control}
              render={({ field }) => (
                <PhotoCaptionsPicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Motion</label>
            <Controller
              name="motion"
              control={control}
              render={({ field }) => (
                <MotionPreferencePicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          {/* Email Preferences */}
          <div
            className="flex flex-col gap-4"
          >
            <label
              className="text-sm font-medium"
            >
              Email preferences
            </label>
            <p
              className="text-foreground/80 text-xs"
            >
              Choose which types of emails you&apos;d like to receive. You can change these
              settings anytime.
            </p>
            {emailTypes.length > 0 ? (
              <div
                className="space-y-3"
              >
                {emailTypes.map((type) => {
                  const fieldName = `emailPreferences.${type.type_key}` as const;
                  return (
                    <Controller
                      key={type.type_key}
                      name={fieldName}
                      control={control}
                      defaultValue={true}
                      render={({ field }) => (
                        <div
                          className="flex items-start gap-2"
                        >
                          <Checkbox
                            id={`emailPref-${type.type_key}`}
                            checked={field.value ?? true}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              field.onChange(checked);
                              // Also update the nested object
                              const currentPrefs = watch('emailPreferences') || {};
                              setValue('emailPreferences', {
                                ...currentPrefs,
                                [type.type_key]: checked,
                              });
                            }}
                            labelClassName="mt-0.75"
                          />
                          <div
                            className="flex-1"
                          >
                            <label
                              htmlFor={`emailPref-${type.type_key}`}
                              className="cursor-pointer text-sm font-medium"
                            >
                              {type.type_label}
                            </label>
                            {type.description && (
                              <p
                                className="text-foreground/80 mt-1 text-xs"
                              >
                                {type.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    />
                  );
                })}
              </div>
            ) : (
              <p
                className="text-foreground/50 text-xs"
              >
                Loading email preferences...
              </p>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
