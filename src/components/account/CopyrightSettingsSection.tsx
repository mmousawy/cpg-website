'use client';

import { Control, Controller, useWatch } from 'react-hook-form';

import Container from '@/components/layout/Container';
import HelpLink from '@/components/shared/HelpLink';
import Input from '@/components/shared/Input';
import Select from '@/components/shared/Select';
import Toggle from '@/components/shared/Toggle';
import { routes } from '@/config/routes';
import Link from 'next/link';
import type { AccountFormData } from '@/hooks/useAccountForm';
import { LICENSE_ORDER, LICENSE_TYPES } from '@/utils/licenses';

interface CopyrightSettingsSectionProps {
  control: Control<AccountFormData>;
  isSaving: boolean;
}

const WATERMARK_STYLES = [
  {
    value: 'text',
    label: 'Corner text',
    description: 'Small text in the bottom-right corner.',
  },
  {
    value: 'diagonal',
    label: 'Diagonal text',
    description: 'Centered text at a 45° angle across the image.',
  },
] as const;

export default function CopyrightSettingsSection({
  control,
  isSaving,
}: CopyrightSettingsSectionProps) {
  const copyrightName = useWatch({ control, name: 'copyrightName' });
  const displayName = copyrightName || 'Your Name';

  return (
    <div>
      <h2
        className="mb-4 text-lg font-semibold opacity-70"
      >
        Copyright & licensing
      </h2>
      <Container>
        <div
          className="space-y-6"
        >
          <p
            className="text-foreground/50 -mt-2 text-xs"
          >
            Set defaults for new photo uploads. You can change the license per photo when editing.
            {' '}
            <Link
              href={routes.helpLicenses.url}
              className="text-primary hover:underline underline-offset-4"
            >
              Learn more about licenses
            </Link>
          </p>

          {/* Default license */}
          <div
            className="flex flex-col gap-2"
          >
            <span
              className="text-sm font-medium flex items-center"
            >
              Default license for new uploads
              <HelpLink
                href={routes.helpLicenses.url}
                label="Learn about licenses"
                className="size-5!"
                iconClassName="size-4"
              />
            </span>
            <Controller
              name="defaultLicense"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  options={LICENSE_ORDER.map((value) => ({
                    value,
                    label: LICENSE_TYPES[value].shortName,
                  }))}
                  disabled={isSaving}
                />
              )}
            />
            <Controller
              name="defaultLicense"
              control={control}
              render={({ field }) => (
                <p
                  className="text-foreground/50 text-xs"
                >
                  {LICENSE_TYPES[field.value].description}
                </p>
              )}
            />
          </div>

          {/* Copyright holder name */}
          <div
            className="flex flex-col gap-2"
          >
            <label
              htmlFor="copyrightName"
              className="text-sm font-medium"
            >
              Copyright holder name
            </label>
            <Controller
              name="copyrightName"
              control={control}
              render={({ field }) => (
                <Input
                  id="copyrightName"
                  type="text"
                  {...field}
                  placeholder="Your name or business"
                  disabled={isSaving}
                />
              )}
            />
            <p
              className="text-foreground/50 text-xs"
            >
              Used in copyright notices and watermarks (e.g. &quot;© 2026 Your Name&quot;)
            </p>
          </div>

          {/* Auto-watermark */}
          <div
            className="flex flex-col gap-2"
          >
            <label
              className="text-sm font-medium"
            >
              Auto-watermark photos
            </label>
            <Controller
              name="watermarkEnabled"
              control={control}
              render={({ field }) => (
                <Toggle
                  id="watermarkEnabled"
                  leftLabel="Off"
                  rightLabel="On"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  disabled={isSaving}
                />
              )}
            />
            <p
              className="text-foreground/50 text-xs"
            >
              Add a text overlay to your photos when uploaded
            </p>
            <Controller
              name="watermarkEnabled"
              control={control}
              render={({ field }) =>
                field.value ? (
                  <div
                    className="flex flex-col gap-4"
                  >
                    <div
                      className="flex flex-col gap-2"
                    >
                      <label
                        className="text-sm font-medium"
                      >
                        Watermark text
                      </label>
                      <Controller
                        name="watermarkText"
                        control={control}
                        render={({ field: textField }) => (
                          <Input
                            type="text"
                            {...textField}
                            placeholder={`© ${displayName}`}
                            disabled={isSaving}
                          />
                        )}
                      />
                      <p
                        className="text-foreground/50 text-xs"
                      >
                        Leave empty to use &quot;©
                        {' '}
                        {displayName}
                        &quot; by default
                      </p>
                    </div>
                    <div
                      className="flex flex-col gap-2"
                    >
                      <label
                        className="text-sm font-medium"
                      >
                        Watermark style
                      </label>
                      <Controller
                        name="watermarkStyle"
                        control={control}
                        render={({ field: styleField }) => (
                          <Select
                            value={styleField.value}
                            onValueChange={styleField.onChange}
                            options={WATERMARK_STYLES.map((s) => ({
                              value: s.value,
                              label: s.label,
                            }))}
                            disabled={isSaving}
                          />
                        )}
                      />
                      <Controller
                        name="watermarkStyle"
                        control={control}
                        render={({ field }) => (
                          <p
                            className="text-foreground/50 text-xs"
                          >
                            {WATERMARK_STYLES.find((s) => s.value === field.value)?.description}
                          </p>
                        )}
                      />
                    </div>
                  </div>
                ) : (
                  <></>
              )
              }
            />
          </div>

          {/* Embed copyright in EXIF */}
          <div
            className="flex flex-col gap-2"
          >
            <label
              className="text-sm font-medium"
            >
              Embed copyright in EXIF
            </label>
            <Controller
              name="embedCopyrightExif"
              control={control}
              render={({ field }) => (
                <Toggle
                  id="embedCopyrightExif"
                  leftLabel="Off"
                  rightLabel="On"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  disabled={isSaving}
                />
              )}
            />
            <p
              className="text-foreground/50 text-xs"
            >
              Add your copyright notice to the photo&apos;s metadata (only if not already present)
            </p>
            <Controller
              name="embedCopyrightExif"
              control={control}
              render={({ field }) =>
                field.value ? (
                  <div
                    className="flex flex-col gap-2"
                  >
                    <label
                      className="text-sm font-medium"
                    >
                      EXIF copyright text
                    </label>
                    <Controller
                      name="exifCopyrightText"
                      control={control}
                      render={({ field: textField }) => (
                        <Input
                          type="text"
                          {...textField}
                          placeholder={`© ${new Date().getFullYear()} ${displayName}. All Rights Reserved.`}
                          disabled={isSaving}
                        />
                      )}
                    />
                    <p
                      className="text-foreground/50 text-xs"
                    >
                      Leave empty to auto-generate from your name and the photo&apos;s license
                    </p>
                  </div>
                ) : (
                  <></>
              )
              }
            />
          </div>
        </div>
      </Container>
    </div>
  );
}
