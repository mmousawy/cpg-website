'use client';

import { Control, Controller, UseFormSetValue, UseFormWatch } from 'react-hook-form';

import type { OnboardingFormData } from '@/app/onboarding/OnboardingClient';
import Container from '@/components/layout/Container';
import Checkbox from '@/components/shared/Checkbox';
import type { EmailTypeData } from '@/utils/emailPreferencesClient';

interface OnboardingEmailPreferencesSectionProps {
  control: Control<OnboardingFormData>;
  watch: UseFormWatch<OnboardingFormData>;
  setValue: UseFormSetValue<OnboardingFormData>;
  emailTypes: EmailTypeData[];
  isLoadingEmailTypes: boolean;
}

export default function OnboardingEmailPreferencesSection({
  control,
  watch,
  setValue,
  emailTypes,
  isLoadingEmailTypes,
}: OnboardingEmailPreferencesSectionProps) {
  return (
    <div>
      <h2
        className="mb-4 text-lg font-semibold opacity-70 font-heading"
      >
        Email preferences
      </h2>
      <Container>
        <p
          className="text-xs text-foreground/80 mb-4"
        >
          Choose which types of emails you&apos;d like to receive. You can change these settings
          anytime.
        </p>
        {isLoadingEmailTypes ? (
          <p
            className="text-xs text-foreground/80"
          >
            Loading preferences...
          </p>
        ) : emailTypes.length > 0 ? (
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
                          const currentPrefs = watch('emailPreferences') || {};
                          setValue('emailPreferences', {
                            ...currentPrefs,
                            [type.type_key]: checked,
                          });
                        }}
                        className="mt-0.5"
                      />
                      <div
                        className="flex-1"
                      >
                        <label
                          htmlFor={`emailPref-${type.type_key}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {type.type_label}
                        </label>
                        {type.description && (
                          <p
                            className="text-xs text-foreground/80 mt-1"
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
            className="text-xs text-foreground/80"
          >
            Unable to load email preferences
          </p>
        )}
      </Container>
    </div>
  );
}
