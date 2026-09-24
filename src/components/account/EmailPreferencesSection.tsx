'use client';

import { Control, Controller, UseFormSetValue, UseFormWatch } from 'react-hook-form';

import Container from '@/components/layout/Container';
import Checkbox from '@/components/shared/Checkbox';
import type { AccountFormData } from '@/hooks/useAccountForm';
import type { EmailTypeData } from '@/utils/emailPreferencesClient';

interface EmailPreferencesSectionProps {
  control: Control<AccountFormData>;
  emailTypes: EmailTypeData[];
  watch: UseFormWatch<AccountFormData>;
  setValue: UseFormSetValue<AccountFormData>;
}

export default function EmailPreferencesSection({
  control,
  emailTypes,
  watch,
  setValue,
}: EmailPreferencesSectionProps) {
  return (
    <div>
      <h2
        className="mb-2 sm:mb-4 text-lg font-semibold opacity-80 font-heading"
      >
        Email preferences
      </h2>
      <Container>
        <div
          className="flex flex-col gap-4"
        >
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
      </Container>
    </div>
  );
}
