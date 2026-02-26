'use client';

import clsx from 'clsx';
import { Control, Controller, UseFormSetValue, UseFormWatch } from 'react-hook-form';

import Container from '@/components/layout/Container';
import Checkbox from '@/components/shared/Checkbox';
import type { AccountFormData } from '@/hooks/useAccountForm';
import type { EmailTypeData } from '@/utils/emailPreferencesClient';

interface PreferencesSectionProps {
  control: Control<AccountFormData>;
  themeMounted: boolean;
  resolvedTheme: string | undefined;
  emailTypes: EmailTypeData[];
  watch: UseFormWatch<AccountFormData>;
  setValue: UseFormSetValue<AccountFormData>;
}

export default function PreferencesSection({
  control,
  themeMounted,
  resolvedTheme,
  emailTypes,
  watch,
  setValue,
}: PreferencesSectionProps) {
  return (
    <div>
      <h2
        className="mb-4 text-lg font-semibold opacity-70"
      >
        App preferences
      </h2>
      <Container>
        <div
          className="space-y-6"
        >
          {/* Theme */}
          <div
            className="flex flex-col gap-2"
          >
            <label
              className="text-sm font-medium"
            >
              Theme
            </label>
            <Controller
              name="theme"
              control={control}
              render={({ field }) => (
                <div
                  className="grid grid-cols-3 gap-2"
                >
                  {[
                    {
                      value: 'system',
                      label: 'Auto',
                      icon: (
                        <svg
                          className="size-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      ),
                    },
                    {
                      value: 'light',
                      label: 'Light',
                      icon: (
                        <svg
                          className="size-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      ),
                    },
                    {
                      value: 'dark',
                      label: 'Dark',
                      icon: (
                        <svg
                          className="size-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                          />
                        </svg>
                      ),
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => field.onChange(option.value)}
                      className={clsx(
                        'flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                        themeMounted && field.value === option.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border-color hover:border-border-color-strong',
                      )}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            />
            <p
              className="text-foreground/50 text-xs"
            >
              {themeMounted && resolvedTheme
                ? `Currently using ${resolvedTheme} mode based on your system`
                : 'Choose your preferred color scheme'}
            </p>
          </div>

          {/* Gallery card style */}
          <div
            className="flex flex-col gap-2"
          >
            <label
              className="text-sm font-medium"
            >
              Gallery card style
            </label>
            <Controller
              name="albumCardStyle"
              control={control}
              render={({ field }) => (
                <div
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {/* Large option */}
                  <button
                    type="button"
                    onClick={() => field.onChange('large')}
                    className={clsx(
                      'rounded-lg border-2 p-3 text-left transition-colors',
                      field.value === 'large'
                        ? 'border-primary bg-primary/5'
                        : 'border-border-color hover:border-border-color-strong',
                    )}
                  >
                    <div
                      className="flex items-start justify-between gap-3"
                    >
                      <div
                        className="flex-1"
                      >
                        <div
                          className="mb-1 flex items-center gap-2"
                        >
                          <div
                            className={clsx(
                              'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                              field.value === 'large'
                                ? 'border-primary'
                                : 'border-border-color-strong',
                            )}
                          >
                            {field.value === 'large' && (
                              <div
                                className="bg-primary size-2 rounded-full"
                              />
                            )}
                          </div>
                          <span
                            className="text-sm font-medium"
                          >
                            Large
                          </span>
                        </div>
                        <p
                          className="text-foreground/50 ml-6 text-xs"
                        >
                          Info visible below image
                        </p>
                      </div>
                      {/* Wireframe - top right */}
                      <div
                        className="border-border-color-strong bg-background w-20 shrink-0 overflow-hidden rounded border"
                      >
                        <div
                          className="bg-foreground/5 h-12"
                        />
                        <div
                          className="bg-background-light border-border-color-strong border-t p-1.5"
                        >
                          <div
                            className="bg-foreground/20 mb-1.5 h-1 w-4/5 rounded"
                          />
                          <div
                            className="flex items-center justify-between"
                          >
                            <div
                              className="flex items-center gap-1"
                            >
                              <div
                                className="bg-foreground/15 size-2 rounded-full"
                              />
                              <div
                                className="bg-foreground/10 h-1 w-6 rounded"
                              />
                            </div>
                            <div
                              className="bg-foreground/10 h-1 w-4 rounded"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Compact option */}
                  <button
                    type="button"
                    onClick={() => field.onChange('compact')}
                    className={clsx(
                      'rounded-lg border-2 p-3 text-left transition-colors',
                      field.value === 'compact'
                        ? 'border-primary bg-primary/5'
                        : 'border-border-color hover:border-border-color-strong',
                    )}
                  >
                    <div
                      className="flex items-start justify-between gap-3"
                    >
                      <div
                        className="flex-1"
                      >
                        <div
                          className="mb-1 flex items-center gap-2"
                        >
                          <div
                            className={clsx(
                              'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                              field.value === 'compact'
                                ? 'border-primary'
                                : 'border-border-color-strong',
                            )}
                          >
                            {field.value === 'compact' && (
                              <div
                                className="bg-primary size-2 rounded-full"
                              />
                            )}
                          </div>
                          <span
                            className="text-sm font-medium"
                          >
                            Compact
                          </span>
                        </div>
                        <p
                          className="text-foreground/50 ml-6 text-xs"
                        >
                          Info shown on hover
                        </p>
                      </div>
                      {/* Wireframe - top right */}
                      <div
                        className="border-border-color-strong bg-background w-20 shrink-0 overflow-hidden rounded border"
                      >
                        <div
                          className="bg-foreground/5 relative h-[4.75rem]"
                        >
                          <div
                            className="from-background-light absolute inset-x-0 top-0 bg-gradient-to-b to-transparent p-1.5"
                          >
                            <div
                              className="bg-foreground/25 h-1 w-3/4 rounded"
                            />
                          </div>
                          <div
                            className="from-background-light absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-1.5"
                          >
                            <div
                              className="flex items-center justify-between"
                            >
                              <div
                                className="flex items-center gap-1"
                              >
                                <div
                                  className="bg-foreground/20 size-2 rounded-full"
                                />
                                <div
                                  className="bg-foreground/15 h-1 w-5 rounded"
                                />
                              </div>
                              <div
                                className="bg-foreground/15 h-1 w-4 rounded"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
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
              className="text-foreground/50 -mt-2 text-xs"
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
                                className="text-foreground/50 mt-1 text-xs"
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
